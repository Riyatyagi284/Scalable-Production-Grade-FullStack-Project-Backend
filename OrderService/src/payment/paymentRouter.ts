import express from "express";
import { asyncWrapper } from "../utils";
import { PaymentController } from "./paymentController";
import { StripeGW } from "./stripe";
import { createMessageBroker } from "../common/factories/brokerFactory";

const router = express.Router();

const paymentGW = new StripeGW();
const broker = createMessageBroker();

const paymentController = new PaymentController(paymentGW, broker);

router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
