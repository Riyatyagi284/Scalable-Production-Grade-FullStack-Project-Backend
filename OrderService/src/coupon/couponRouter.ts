import express from "express";
import authenticate from "../common/middleware/authenticate";
import { canAccess } from "../common/middleware/canAccess";
import { asyncWrapper } from "../utils";
import { CouponController } from "./couponController";

const router = express.Router();
const couponController = new CouponController();

router.post("/verify", ...couponController.verify);

router.use(authenticate);

router.post("/", authenticate, canAccess(["admin", "manager"]), ...couponController.create);
router.get("/", authenticate, canAccess(["manager"]), ...couponController.getAll);
router.get("/:id", authenticate, canAccess(["admin", "manager"]), asyncWrapper(couponController.getById));
router.patch("/:id", authenticate, canAccess(["manager"]), ...couponController.update);
router.delete("/:id", authenticate, canAccess(["admin"]), asyncWrapper(couponController.delete));
router.patch("/:id/deactivate", authenticate, canAccess(["admin", "manager"]), asyncWrapper(couponController.deactivate));

export default router;