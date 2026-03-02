import express from "express";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { OrderController } from "./orderController";
import { StripeGW } from "../payment/stripe";
import { createMessageBroker } from "../common/factories/brokerFactory";
import { CacheFactory } from '../cache/cacheFactory';

const router = express.Router();

const paymentGw = new StripeGW();
const broker = createMessageBroker();

// cache service
const cacheService = CacheFactory.createCacheService({
  type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
  redisConfig: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'order:'
  },
  memoryConfig: {
    defaultTTL: 3600 // 1 hour
  }
});

const orderController = new OrderController(paymentGw, broker, cacheService);

router.post("/", authenticate, asyncWrapper(orderController.create));
router.get("/", authenticate, asyncWrapper(orderController.getAll));
router.get("/mine", authenticate, asyncWrapper(orderController.getMine));
router.get("/:orderId", authenticate, asyncWrapper(orderController.getSingle));
router.patch(
  "/change-status/:orderId",
  authenticate,
  asyncWrapper(orderController.changeStatus),
);

export default router;
