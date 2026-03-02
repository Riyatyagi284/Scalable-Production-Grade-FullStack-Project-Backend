import mongoose, { Schema } from "mongoose";
import { Order, OrderStatus, PaymentMode, PaymentStatus } from "./orderTypes";
import { CartItem } from "../types";

const toppingSchema = new mongoose.Schema({
  id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  // image: {
  //   type: String,
  //   required: true,
  // },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const cartSchema = new mongoose.Schema<CartItem>({
  name: String,
  image: String,
  qty: Number,
  priceConfiguration: {
    type: Map,
    of: {
      priceType: {
        type: String,
        enum: ["base", "aditional"],
        required: true,
      },
      availableOptions: {
        type: Map,
        of: Number,
        required: true,
      },
    },
  },
  chosenConfiguration: {
    priceConfiguration: {
      type: Map,
      of: String,
      required: true,
    },
    selectedToppings: {
      type: [toppingSchema],
      required: true,
    },
  },
});

const orderSchema = new mongoose.Schema<Order>(
  {
    orderNumber: {
      type: String,
      required: false,
    },
    cart: {
      type: [cartSchema],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: false,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: OrderStatus,
    },
    paymentMode: {
      type: String,
      enum: PaymentMode,
    },
    paymentStatus: {
      type: String,
      enum: PaymentStatus,
    },
    paymentId: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

// indexes
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, orderStatus: 1 });
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days (TTL)

// pre-save hooks
orderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

export default mongoose.model("Order", orderSchema);
