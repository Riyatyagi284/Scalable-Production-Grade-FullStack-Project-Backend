import mongoose from "mongoose";
import { CartItem } from "../types";

export enum PaymentMode {
  CARD = "card",
  CASH = "cash",
}

export enum OrderStatus {
  RECEIVED = "received",
  CONFIRMED = "confirmed",
  PREPARED = "prepared",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  PAYMENT_FAILED = "payment_failed"
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
}

export interface Order {
  updateOne(arg0: { paymentId: string; }): unknown;
  _id: string;
  orderNumber?: string;
  cart: CartItem[];
  customerId: mongoose.Types.ObjectId;
  total: number;
  discount: number;
  taxes: number;
  deliveryCharges: number;
  address: string;
  tenantId: string;
  comment?: string;
  paymentMode: PaymentMode;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
}

export interface OrderItem {
  name: string;
  image: string;
  qty: number;
  priceConfiguration: Record<string, any>;
  chosenConfiguration: Record<string, any>;
}

export interface OrderRequestBody {
  cart: OrderItem[];
  couponCode?: string;
  tenantId: string;
  paymentMode: "Card" | "Cash";
  customerId: string;
  comment?: string;
  address: string;
}

export enum OrderEvents {
  ORDER_CREATE = "ORDER_CREATE",
  PAYMENT_STATUS_UPDATE = "PAYMENT_STATUS_UPDATE",
  ORDER_STATUS_UPDATE = "ORDER_STATUS_UPDATE",
}

export interface OrderApiResponse {
  success: boolean;
  data: OrderResponseData;
  metadata: OrderResponseMetadata;
}

export interface OrderResponseData {
  orderId: string;
  total: number;
  status: string;
  paymentUrl: string | null;
  requiresRedirect: boolean;
}

export interface OrderResponseMetadata {
  // transactionId: string;
  timestamp: string;
  cached: boolean;
}
