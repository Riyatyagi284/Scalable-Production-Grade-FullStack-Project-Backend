import { Order, OrderEvents } from "../order/orderTypes";

export interface FailedOrderMessage {
  event_type: OrderEvents;
  data: {
    order: Order;
    customer: {
      id: string;
      email: string;
    };
  };
  metadata: {
    timestamp: string;
    // transactionId: string;
    version: string;
  };
}
