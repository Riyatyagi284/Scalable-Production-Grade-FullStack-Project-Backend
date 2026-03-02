import { NextFunction, Request, Response } from "express";
import { Request as AuthRequest } from "express-jwt";
import { v4 as uuidv4 } from "uuid";
import {
  CartItem,
  ProductPricingCache,
  ROLES,
  Topping,
  ToppingPriceCache,
} from "../types";
import productCacheModel from "../productCache/productCacheModel";
import toppingCacheModel from "../toppingCache/toppingCacheModel";
import couponModel from "../coupon/couponModel";
import orderModel from "./orderModel";
import {
  Order,
  OrderApiResponse,
  OrderEvents,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
} from "./orderTypes";
import idempotencyModel from "../idempotency/idempotencyModel";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import { PaymentGW } from "../payment/paymentTypes";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/customerModel";
import { getPagination } from "./order-utils/pagination";
import { OrderService } from "./orderService";
import logger from "../config/logger";
import { Customer } from "../customer/customerTypes";
import { validateOrderRequest } from "./order-utils/ValidateOrderRequest";
import { CacheKeys } from "../cache/CacheKeysUtilities";
import { FailedOrderMessage } from "../types/FailedMessageOrder";
import { failedMessagesModel } from "../failedMessage/failedMessageModel";
import { ICacheService } from "../cache/types";
import config from "config";

export class OrderController {
  private readonly TAXES_PERCENT = config.get<number>("order.TAXES_PERCENT");
  private readonly DELIVERY_CHARGES = config.get<number>(
    "order.DELIVERY_CHARGES",
  );
  private readonly MAX_RETRY_ATTEMPTS = config.get<number>(
    "order.MAX_RETRY_ATTEMPTS",
  );

  constructor(
    private paymentGw: PaymentGW,
    private broker: MessageBroker,
    private cache: ICacheService,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info("Create order request started", {
        transactionId,
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      // Validate Idempotency Key
      const idempotencyKey = req.headers["x-idempotency-key"] as string;
      if (!idempotencyKey) {
        logger.warn("Missing idempotency key", { transactionId });
        return next(createHttpError(400, "Idempotency key is required"));
      }

      // validation related
      const idempotencyCacheKey = CacheKeys.idempotency(idempotencyKey);

      const cachedResponse = await this.cache.get(idempotencyCacheKey);
      if (cachedResponse) {
        logger.info("Serving from cache", { transactionId, idempotencyKey });
        return res.json(JSON.parse(cachedResponse));
      }

      const validationResult = await validateOrderRequest(req.body);
      if (!validationResult.isValid) {
        // logger.warn("Validation failed", {
        //   transactionId,
        //   errors: validationResult.errors,
        // });
        logger.warn("Validation failed", {
          errors: validationResult.errors,
        });
        // return next(
        //   createHttpError(422, "Invalid request data", {
        //     details: validationResult.errors,
        //   }),
        // );
        if (!validationResult.isValid) {
          return res.status(422).json({
            message: "Validation failed",
            errors: validationResult.errors,
          });
        }
      }

      const {
        cart,
        couponCode,
        tenantId,
        paymentMode,
        customerId,
        comment,
        address,
      } = req.body;

      const customer = await customerModel.findById(customerId).lean();
      if (!customer) {
        // logger.warn("Customer not found", { transactionId, customerId });
        logger.warn("Customer not found", { customerId });
        return next(createHttpError(404, "Customer not found"));
      }

      if (!Object.values(PaymentMode).includes(paymentMode)) {
        return next(createHttpError(400, "Invalid payment mode"));
      }

      if (!cart || cart.length === 0) {
        return next(createHttpError(400, "Cart cannot be empty"));
      }

      // Calculation
      const pricingResult = await this.calculateOrderPricingWithRetry({
        cart,
        couponCode,
        tenantId,
        // transactionId,
      });

      if (!pricingResult.success) {
        logger.error("Price calculation failed", {
          // transactionId,
          error: pricingResult.error,
        });
        return next(createHttpError(500, "Failed to calculate order total"));
      }

      const { discountAmount, taxes, finalTotal, priceAfterDiscount } =
        pricingResult.data;

      if (finalTotal < 1) {
        return next(createHttpError(400, "Order total must be at least 1 INR"));
      }

      // 8. idempotency check
      const existingIdempotency = await idempotencyModel.findOne({
        key: idempotencyKey,
      });

      if (existingIdempotency) {
        await this.cache.set(
          idempotencyCacheKey,
          JSON.stringify(existingIdempotency.response),
          24 * 60 * 60, // 24 hours (TTL)
        );

        return this.handleExistingOrder(
          existingIdempotency.response,
          paymentMode,
          res,
          // transactionId,
        );
      }

      const newOrder = await this.createOrderTransaction(
        {
          cart,
          address,
          comment,
          customerId,
          tenantId,
          paymentMode,
          discountAmount,
          taxes,
          finalTotal,
          priceAfterDiscount,
          idempotencyKey,
          // transactionId,
        },
        req,
      );

      await this.sendOrderEventWithRetry({
        order: newOrder,
        customer,
        // transactionId,
      });

      const paymentResult = await this.handlePayment({
        paymentMode,
        finalTotal,
        orderId: newOrder._id.toString(),
        tenantId,
        idempotencyKey,
        // transactionId,
      });

      const response = {
        success: true,
        data: {
          orderId: newOrder._id,
          total: finalTotal,
          status: newOrder.orderStatus,
          ...paymentResult,
        },
        metadata: {
          // transactionId,
          timestamp: new Date().toISOString(),
        },
      };

      await this.cache.set(
        idempotencyCacheKey,
        JSON.stringify(response),
        24 * 60 * 60,
      );

      await idempotencyModel.create({
        key: idempotencyKey,
        tenantId,
        response,
      });

      logger.info("Order created successfully", {
        // transactionId,
        orderId: newOrder._id,
        customerId,
        total: finalTotal,
        duration: Date.now() - startTime,
      });

      return res.status(201).json(response);
    } catch (error) {
      logger.error("Create order failed", {
        // transactionId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
      });

      // Handle specific error types
      if (error instanceof mongoose.Error.ValidationError) {
        return next(
          createHttpError(422, "Validation error", { details: error.errors }),
        );
      }

      if (error.code === 11000) {
        return next(createHttpError(409, "Duplicate order detected"));
      }

      return next(createHttpError(500, "Internal server error"));
    }
  };

  // /////////////
  // Helper Methods
  // //////////////

  private async calculateOrderPricingWithRetry(params: {
    cart: CartItem[];
    couponCode?: string;
    tenantId: number;
    // transactionId: string;
  }): Promise<{
    success: boolean;
    data?: {
      total: number;
      discountAmount: number;
      taxes: number;
      finalTotal: number;
      priceAfterDiscount: number;
    };
    error?: string;
  }> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const totalPrice = await this.calculateTotal(
          params.cart,
          params.tenantId,
        );

        let discountPercentage = 0;
        if (params.couponCode) {
          discountPercentage = await this.validateAndGetDiscount(
            params.couponCode,
            params.tenantId,
            totalPrice,
          );
        }

        const discountAmount = Math.round(
          (totalPrice * discountPercentage) / 100,
        );

        const priceAfterDiscount = totalPrice - discountAmount;

        const taxes = Math.round(
          (priceAfterDiscount * this.TAXES_PERCENT) / 100,
        );

        const finalTotal = priceAfterDiscount + taxes + this.DELIVERY_CHARGES;

        return {
          success: true,
          data: {
            total: totalPrice,
            discountAmount,
            taxes,
            finalTotal,
            priceAfterDiscount,
          },
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Price calculation attempt ${attempt} failed`, {
          // transactionId: params.transactionId,
          error: error.message,
        });

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 100)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Price calculation failed",
    };
  }

  private async validateAndGetDiscount(
    couponCode: string,
    tenantId: number,
    totalAmount: number,
  ): Promise<number> {
    const coupon = await couponModel.findOne({
      code: couponCode.toUpperCase(),
      tenantId,
      isActive: true,
      validUpto: { $gt: new Date() },
    });

    if (!coupon) {
      throw new Error("Invalid or expired coupon");
    }

    if (coupon.isExpired) {
      throw new Error("Coupon is expired");
    }

    if (totalAmount < coupon.minOrderValue) {
      throw new Error(
        `Minimum order value of ${coupon.minOrderValue} required`,
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit exceeded");
    }

    return coupon.discount;
  }

  private async createOrderTransaction(
    params: {
      cart: CartItem[];
      address: string;
      comment?: string;
      customerId: string;
      tenantId: string;
      paymentMode: string;
      discountAmount: number;
      taxes: number;
      finalTotal: number;
      priceAfterDiscount: number;
      idempotencyKey: string;
      // transactionId: string;
    },
    req: Request,
  ): Promise<Order> {
    // const session = await mongoose.startSession();

    try {
      // session.startTransaction();

      // Create order
      const [newOrder] = await orderModel.create(
        [
          {
            cart: params.cart,
            address: params.address,
            comment: params.comment,
            customerId: params.customerId,
            deliveryCharges: this.DELIVERY_CHARGES,
            discount: params.discountAmount,
            taxes: params.taxes,
            tenantId: params.tenantId,
            total: params.finalTotal,
            subtotal: params.priceAfterDiscount,
            paymentMode: params.paymentMode,
            orderStatus: OrderStatus.RECEIVED,
            paymentStatus: PaymentStatus.PENDING,
            // transactionId: params.transactionId,
            metadata: {
              source: "web",
              userAgent: req?.headers["user-agent"],
              ipAddress: req?.ip,
            },
          },
        ],
        // { session },
      );

      // Update coupon usage if applicable
      // if (params.couponCode) {
      //   await couponModel.updateOne(
      //     { code: params.couponCode, tenantId: params.tenantId },
      //     { $inc: { usageCount: 1 } },
      //     { session },
      //   );
      // }

      // await session.commitTransaction();

      return newOrder;
    } finally {
      // catch (error) {
      //   // await session.abortTransaction();
      //   throw error;
      // }
      // await session.endSession();
    }
  }

  private async sendOrderEventWithRetry(params: {
    order: Order;
    customer: Customer;
    // transactionId: string;
  }): Promise<void> {
    const message = {
      event_type: OrderEvents.ORDER_CREATE,
      data: {
        order: params.order,
        customer: {
          id: params.customer.userId,
          email: params.customer.email,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        // transactionId: params.transactionId,
        version: "1.0",
      },
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.broker.sendMessage(
          "orders",
          JSON.stringify(message),
          params.order._id.toString(),
        );
        logger.info("Order event sent successfully", {
          // transactionId: params.transactionId,
          attempt,
        });
        return;
      } catch (error) {
        logger.error(`Failed to send order event (attempt ${attempt})`, {
          // transactionId: params.transactionId,
          error: error.message,
        });

        if (attempt === 3) {
          await this.storeFailedMessage(message);
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  private async handlePayment(params: {
    paymentMode: string;
    finalTotal: number;
    orderId: string;
    tenantId: string;
    idempotencyKey: string;
    // transactionId: string;
  }): Promise<{
    paymentUrl: string | null;
    requiresRedirect: boolean;
    paymentSessionId?: string;
  }> {
    if (params.paymentMode === PaymentMode.CARD) {
      try {
        const session = await this.paymentGw.createSession({
          amount: params.finalTotal,
          orderId: params.orderId,
          tenantId: params.tenantId,
          currency: "inr",
          idempotenencyKey: params.idempotencyKey,
        });

        await orderModel.updateOne(
          { _id: params.orderId },
          { $set: { paymentId: session.id } },
        );

        return {
          paymentUrl: session.paymentUrl,
          paymentSessionId: session.id,
          requiresRedirect: true,
        };
      } catch (error) {
        logger.error("Payment session creation failed", {
          // transactionId: params.transactionId,
          error: error.message,
        });

        await orderModel.updateOne(
          { _id: params.orderId },
          {
            $set: {
              paymentStatus: PaymentStatus.FAILED,
              orderStatus: OrderStatus.PAYMENT_FAILED,
            },
          },
        );

        throw new Error("Payment gateway error");
      }
    }

    return {
      paymentUrl: null,
      requiresRedirect: false,
    };
  }

  private async handleExistingOrder(
    existingOrder: Order,
    paymentMode: string,
    res: Response,
    // transactionId: string,
  ): Promise<void> {
    logger.info("Returning existing order", {
      // transactionId,
      orderId: existingOrder._id,
    });

    const response: OrderApiResponse = {
      success: true,
      data: {
        orderId: existingOrder._id,
        total: existingOrder.total,
        status: existingOrder.orderStatus,
        paymentUrl: null,
        requiresRedirect: false,
      },
      metadata: {
        // transactionId,
        timestamp: new Date().toISOString(),
        cached: true,
      },
    };

    //
    if (
      paymentMode === PaymentMode.CARD &&
      existingOrder.paymentStatus === PaymentStatus.PENDING
    ) {
      const isValid = await this.paymentGw.validateSession(
        existingOrder.paymentId,
      );

      if (!isValid) {
        const newSession = await this.paymentGw.createSession({
          amount: existingOrder.total,
          orderId: existingOrder._id.toString(),
          tenantId: existingOrder.tenantId,
          currency: "inr",
          // idempotenencyKey: transactionId,
        });
        await existingOrder.updateOne({ paymentId: newSession.id });

        response.data.paymentUrl = newSession.paymentUrl;
        response.data.requiresRedirect = true;
      }
    }

    res.json(response);
  }

  private async storeFailedMessage(message: FailedOrderMessage): Promise<void> {
    await failedMessagesModel.create({
      topic: "orders",
      message: JSON.stringify(message),
      retryCount: 0,
      lastAttempt: new Date(),
      status: "pending",
    });
  }

  private calculateTotal = async (cart: CartItem[], tenantId) => {
    const productIds = cart.map((item) => item._id);

    // todo: need to add error handling here.
    const productPricings = await productCacheModel.find({
      productId: {
        $in: productIds,
      },
    });

    // todo: need to handle the case when product does not exists in the cache 
    // 1. call catalog service.
    // 2. Use price from cart <- BAD

    const cartToppingIds = cart.reduce((acc, item) => {
      return [
        ...acc,
        ...item.chosenConfiguration.selectedToppings.map(
          (topping) => topping.id,
        ),
      ];
    }, []);

    // todo: need to handle the case when topping does not exists in the cache
    const toppingPricings = await toppingCacheModel.find({
      toppingId: {
        $in: cartToppingIds,
      },
      tenantId: Number(tenantId),
    });

    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId.toString() === curr._id.toString(),
      );

      if (!cachedProductPrice) {
        console.warn("Product price not found for", curr._id);
        throw new Error(`Product price not found for id: ${curr._id}`);
      }

      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);

    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductPricingCache,
    toppingsPricings: ToppingPriceCache[],
  ) => {
    const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
      (acc, curr) => {
        return acc + this.getCurrentToppingPrice(curr, toppingsPricings);
      },
      0,
    );

    const { size, type } = item.chosenConfiguration.priceConfiguration;

    const productTotal =
      cachedProductPrice.priceConfiguration[type].availableOptions[size];

    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricings: ToppingPriceCache[],
  ) => {
    const currentTopping = toppingPricings.find(
      (current) => topping.id.toString() === current.toppingId.toString(),
    );

    if (!currentTopping) {
      // todo: Make sure the item is in the cache else, maybe call catalog service.
      return topping.price;
    }

    return currentTopping.price;
  };

  // /////////////
  // Helper Method
  // ////////////

  getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { role, tenant: userTenantId } = req.auth;

    const tenantId = req.query.tenantId;

    if (role === ROLES.CUSTOMER)
      return next(createHttpError(403, "Not allowed."));

    const { page, limit, skip } = getPagination(req.query);

    const filter: Record<string, unknown> = {};

    if (role === ROLES.ADMIN) {
      if (tenantId) filter.tenantId = tenantId;
    }

    if (role === ROLES.MANAGER) {
      filter.tenantId = userTenantId;
    }

    const { orders, total } = await OrderService.getOrders(filter, skip, limit);

    logger.info("Orders retrieved", {
      actorRole: role,
      tenantId: role === ROLES.MANAGER ? userTenantId : tenantId || "all",
      count: orders.length,
      total,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: orders,
    });
  };

  getMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = Number(req.auth.sub);

    if (!userId) {
      logger.warn("No userId found in auth token");
      return next(createHttpError(400, "No userId found."));
    }

    const customer = await customerModel.findOne({ userId: userId });

    if (!customer) {
      logger.warn("Customer record not found", { userId });
      return next(createHttpError(400, "No customer found."));
    }

    const { page, limit, skip } = getPagination(req.query);
    const { orders, total } = await OrderService.getMineOrders(
      skip,
      limit,
      customer,
    );

    logger.info("Customer orders retrieved", {
      userId,
      customerId: customer._id,
      count: orders.length,
      total,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: orders,
    });
  };

  getSingle = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = req.params.orderId;
    const { sub: userId, role, tenant: tenantId } = req.auth;

    const fields = req.query.fields
      ? req.query.fields.toString().split(",")
      : []; // this way -> ["orderStatus", "paymentStatus"]

    const projection = fields.reduce(
      (acc, field) => {
        acc[field] = 1;
        return acc;
      },
      { customerId: 1 },
    );

    const order = await orderModel
      .findOne({ _id: orderId }, projection)
      .populate("customerId")
      .exec();
    if (!order) {
      return next(createHttpError(400, "Order does not exists."));
    }

    // What roles can access this endpoint: Admin, manager (for their own restaurant), customer (own order)
    if (role === "admin") {
      return res.json(order);
    }

    const myRestaurantOrder = order.tenantId === tenantId;
    if (role === "manager" && myRestaurantOrder) {
      return res.json(order);
    }

    if (role === "customer") {
      const customer = await customerModel.findOne({ userId });

      if (!customer) {
        return next(createHttpError(400, "No customer found."));
      }

      if (order.customerId._id.toString() === customer._id.toString()) {
        return res.json(order);
      }
    }

    return next(createHttpError(403, "Operation not permitted."));
  };

  changeStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const { role, tenant: tenantId } = req.auth;
    const orderId = req.params.orderId;

    if (role === ROLES.MANAGER || ROLES.ADMIN) {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return next(createHttpError(400, "Order not found."));
      }

      const isMyRestaurantOrder = order.tenantId === tenantId;

      if (role === ROLES.MANAGER && !isMyRestaurantOrder) {
        return next(createHttpError(403, "Not allowed."));
      }

      const updatedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId },
        { orderStatus: req.body.status },
        { new: true },
      );

      const customer = await customerModel.findOne({
        _id: updatedOrder.customerId,
      });

      const brokerMessage = {
        event_type: OrderEvents.ORDER_STATUS_UPDATE,
        data: { ...updatedOrder.toObject(), customerId: customer },
      };

      await this.broker.sendMessage(
        "order",
        JSON.stringify(brokerMessage),
        updatedOrder._id.toString(),
      );

      return res.json({ _id: updatedOrder._id });
    }

    return next(createHttpError(403, "Not allowed."));
  };
}
