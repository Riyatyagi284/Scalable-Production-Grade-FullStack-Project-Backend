import { NextFunction, Request, Response } from "express";
import { couponService } from "./couponService";
import {
  createCouponSchema,
  verifyCouponSchema,
  updateCouponSchema,
  paginationSchema,
} from "./couponValidator";
import { validateRequestBodyData } from "./couponValidateRequest";
import createHttpError from "http-errors";
import { AuthRequest } from "../types/index";

export class CouponController {
  create = [
    validateRequestBodyData(createCouponSchema()),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const _req = req as AuthRequest;

        const role = _req.auth.role;
        const tenantFromToken = _req.auth?.tenant;

        if (role === "admin") {
          if (!req.body.tenantId) {
            return next(createHttpError(400, "tenantId is required for admin"));
          }
        } else {
          if (!tenantFromToken) {
            return next(createHttpError(400, "Tenant not found in token"));
          }

          req.body.tenantId = tenantFromToken;
        }

        const coupon = await couponService.createCoupon(req.body);
        return res.status(201).json({
          success: true,
          data: coupon,
          message: "Coupon created successfully",
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  verify = [
    validateRequestBodyData(verifyCouponSchema()),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await couponService.verifyCoupon(req.body);

        return res.status(200).json({
          success: true,
          data: result,
          message: result.valid ? "Coupon is valid" : "Coupon is invalid",
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  getAll = [
    validateRequestBodyData(paginationSchema()),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const _req = req as AuthRequest;

        const tenantId = _req.auth?.tenant;

        if (!tenantId) {
          return next(createHttpError(400, "Tenant ID is required"));
        }

        const { page = 1, limit = 10, isActive, search } = req.query;

        const result = await couponService.getCoupons(
          parseInt(tenantId),
          parseInt(page as string),
          parseInt(limit as string),
          {
            isActive: isActive ? isActive === "true" : undefined,
            search: search as string,
          },
        );

        return res.status(200).json({
          success: true,
          data: result.coupons,
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const _req = req as AuthRequest;

      const tenantFromToken = Number(_req.auth?.tenant);

      const role = _req.auth?.role;

      const { id } = req.params;

      let tenantId: number;

      if (role === "admin") {
        if (!req.body.tenantId) {
          return next(createHttpError(400, "tenantId is required for admin"));
        }

        tenantId = Number(req.body.tenantId);

        if (!tenantId) {
          return next(createHttpError(400, "Invalid tenantId for admin"));
        }
      } else {
        // Non-admin
        if (!tenantFromToken) {
          return next(createHttpError(400, "Tenant not found in token"));
        }

        tenantId = tenantFromToken;
      }

      const coupon = await couponService.getCouponById(id, tenantId);

      if (!coupon) {
        return next(createHttpError(404, "Coupon not found"));
      }

      return res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  update = [
    validateRequestBodyData(updateCouponSchema()),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const _req = req as AuthRequest;

        const tenant = _req.auth?.tenant;
        const tenantId = Number(tenant);

        if (!tenantId) {
          return next(createHttpError(400, "Tenant ID is required"));
        }

        const allowedFields = [
          "title",
          "code",
          "validUpto",
          "discount",
          "isActive",
          "usageLimit",
          "minOrderValue",
        ];

        // Filter and validate request body
        const updateData = {};
        for (const key of Object.keys(req.body)) {
          if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
          } else {
            return next(
              createHttpError(400, `Field "${key}" is not allowed to update`),
            );
          }
        }

        if (Object.keys(updateData).length === 0) {
          return next(
            createHttpError(400, "No valid data provided for update"),
          );
        }

        const coupon = await couponService.updateCoupon(
          id,
          tenantId,
          updateData,
        );

        return res.status(200).json({
          success: true,
          data: coupon,
          message: "Coupon updated successfully",
        });
      } catch (error) {
        next(error);
      }
    },
  ];

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await couponService.deleteCoupon(id);

      return res.status(200).json({
        success: true,
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  // testing left
  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const _req = req as AuthRequest;
      // const tenantId = _req.user?.tenantId;

      // if (!tenantId) {
      //   return next(createHttpError(400, "Tenant ID is required"));
      // }

      const tenantFromToken = Number(_req.auth?.tenant);

      const role = _req.auth?.role;

      let tenantId: number;

      if (role === "admin") {
        if (!req.body.tenantId) {
          return next(createHttpError(400, "tenantId is required for admin"));
        }

        tenantId = Number(req.body.tenantId);

        if (!tenantId) {
          return next(createHttpError(400, "Invalid tenantId for admin"));
        }
      } else {
        // Non-admin
        if (!tenantFromToken) {
          return next(createHttpError(400, "Tenant not found in token"));
        }

        tenantId = tenantFromToken;
      }

      const coupon = await couponService.deactivateCoupon(id, tenantId);

      return res.status(200).json({
        success: true,
        data: coupon,
        message: "Coupon deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
