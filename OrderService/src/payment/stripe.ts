import Stripe from "stripe";
import config from "config";
import {
  CustomMetadata,
  PaymentGW,
  PaymentOptions,
  VerifiedSession,
} from "./paymentTypes";

export class StripeGW implements PaymentGW {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.get("stripe.secretKey"));
  }
  async validateSession(paymentId: string): Promise<boolean> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(paymentId);
      // we will consider valid if session still open
      return session.status === "open";
    } catch (err) {
      return false;
    }
  }

  async createSession(options: PaymentOptions) {
    const session = await this.stripe.checkout.sessions.create(
      {
        metadata: {
          orderId: options.orderId,
          restaurantId: options.tenantId,
        },
        billing_address_collection: "required",
    
        line_items: [
          {
            price_data: {
              unit_amount: options.amount * 100,
              product_data: {
                name: "Online Pizza order",
                description: "Total amount to be paid",
                images: ["https://placehold.jp/150x150.png"],
              },
              currency: options.currency || "inr",
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${config.get("frontend.clientUI")}/payment?success=true&orderId=${options.orderId}&restaurantId=${options.tenantId}`,
        cancel_url: `${config.get("frontend.clientUI")}/payment?success=false&orderId=${options.orderId}&restaurantId=${options.tenantId}`,
      },
      { idempotencyKey: options.idempotenencyKey },
    );

    return {
      id: session.id,
      paymentUrl: session.url,
      paymentStatus: session.payment_status,
    };
  }

  async getSession(id: string) {
    const session = await this.stripe.checkout.sessions.retrieve(id);

    const verifiedSession: VerifiedSession = {
      id: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata as unknown as CustomMetadata,
    };

    return verifiedSession;
  }
}
