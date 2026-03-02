import { Customer } from "../customer/customerTypes";
import orderModel from "./orderModel";

export class OrderService {
  static async getOrders(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ) {
    const [orders, total] = await Promise.all([
      orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId")
        .lean(),

      orderModel.countDocuments(filter),
    ]);

    return { orders, total };
  }

  static async getMineOrders(
    skip: number,
    limit: number,
    customer: Customer,
  ) {
    const [orders, total] = await Promise.all([
      orderModel
        .find(
          { customerId: customer._id },
          { cart: 0 }, // projection(field exclusion)
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      orderModel.countDocuments({ customerId: customer._id }),
    ]);

    return { orders, total };
  }
}
