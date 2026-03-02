import { body, query, param, ValidationChain } from "express-validator";
import couponModel from "./couponModel";
import { AuthRequest } from "../types";

export const createCouponSchema = (): ValidationChain[] => [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 4, max: 20 })
    .withMessage("Coupon code must be between 4 and 20 characters")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage(
      "Coupon code can only contain letters, numbers, hyphens and underscores",
    )
    .toUpperCase(),

  body("validUpto")
    .notEmpty()
    .withMessage("Expiry date is required")
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value: string) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),

  body("discount")
    .notEmpty()
    .withMessage("Discount is required")
    .isFloat({ min: 1, max: 100 })
    .withMessage("Discount must be between 1 and 100 percent"),

  body("tenantId")
    .notEmpty()
    .withMessage("Tenant ID is required")
    .isInt({ min: 1 })
    .withMessage("Tenant ID must be a positive integer"),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),

  body("minOrderValue")
    .optional()
    .default(0)
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be 0 or greater"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
    .toBoolean(),
];

export const verifyCouponSchema = (): ValidationChain[] => [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 4, max: 20 })
    .withMessage("Coupon code must be between 4 and 20 characters")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage(
      "Coupon code can only contain letters, numbers, hyphens and underscores",
    )
    .toUpperCase(),

  body("tenantId")
    .notEmpty()
    .withMessage("Tenant ID is required")
    .isInt({ min: 1 })
    .withMessage("Tenant ID must be a positive integer"),

  body("orderValue")
    .optional()
    .default(0)
    .isFloat({ min: 0 })
    .withMessage("Order value must be 0 or greater"),
];

export const updateCouponSchema = (): ValidationChain[] => [
  param("id")
    .notEmpty()
    .withMessage("Coupon ID is required")
    .isMongoId()
    .withMessage("Invalid coupon ID format"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("code")
  .optional()
  .trim()
  .isLength({ min: 4, max: 20 })
  .withMessage("Coupon code must be between 4 and 20 characters")
  .matches(/^[A-Z0-9_-]+$/)
  .withMessage(
    "Coupon code can only contain letters, numbers, hyphens and underscores",
  )
  .toUpperCase()
  .custom(async (value, { req }) => {
    if (!value) return true;

    const _req = req as AuthRequest;
    const tenantId = Number(_req.auth?.tenant);

    if (!tenantId) throw new Error("Tenant ID is missing");

    // Check duplicate code for same tenant (excluding itself)
    const existing = await couponModel.findOne({
      code: value.toUpperCase(),
      tenantId,
      _id: { $ne: req.params.id }, // Exclude current coupon
    });

    if (existing) {
      throw new Error("Coupon code already exists for this tenant");
    }

    return true;
  }),

  body("validUpto")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value: string) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),

  body("discount")
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage("Discount must be between 1 and 100 percent"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
    .toBoolean(),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),

  body("minOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be 0 or greater"),
];

export const paginationSchema = (): ValidationChain[] => [
  query("page")
    .optional()
    .default(1)
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .default(10)
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be either 'true' or 'false'")
    .customSanitizer((value) => value === "true"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term cannot exceed 100 characters")
    .escape(),
];

export const couponIdValidation = (): ValidationChain[] => [
  param("id")
    .notEmpty()
    .withMessage("Coupon ID is required")
    .isMongoId()
    .withMessage("Invalid coupon ID format"),
];

export const tenantIdValidation = (): ValidationChain[] => [
  query("tenantId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Tenant ID must be a positive integer")
    .toInt(),
];

export const validateCouponExists = (): ValidationChain[] => [
  param("id")
    .isMongoId()
    .withMessage("Invalid coupon ID")
    .custom(async (value, { req }) => {
      const coupon = await couponModel.findById(value);

      if (!coupon) {
        throw new Error("Coupon not found");
      }
      
      req.coupon = coupon;
      return true;
    }),
];
