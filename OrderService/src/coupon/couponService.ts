import { FilterQuery } from "mongoose";
import couponModel, { CouponModel } from "./couponModel";
import { 
    Coupon,
  CreateCouponRequest, 
  UpdateCouponRequest, 
  VerifyCouponRequest, 
  VerifyCouponResponse 
} from "./couponTypes";
import createHttpError from "http-errors";
import logger from "../config/logger";

export class CouponService {
  constructor(private couponModel: CouponModel) {}

  async createCoupon(data: CreateCouponRequest): Promise<Coupon> {
    try {
      // Check if coupon code already exists for this tenant
      const existingCoupon = await this.couponModel.findOne({
        code: data.code.toUpperCase(),
        tenantId: data.tenantId,
      });

      if (existingCoupon) {
        throw (createHttpError(409, "Coupon code already exists for this tenant"));
      }

      const coupon = await this.couponModel.create({
        ...data,
        code: data.code.toUpperCase(),
      });

      logger.info("Coupon created successfully", {
        couponId: coupon._id,
        tenantId: data.tenantId,
      });

      return coupon;
    } catch (error) {
      logger.error("Error creating coupon", {
        error,
        tenantId: data.tenantId,
      });
      throw error;
    }
  }

  async verifyCoupon(data: VerifyCouponRequest): Promise<VerifyCouponResponse> {
    try {
      const { code, tenantId, orderValue = 0 } = data;

      const result = await this.couponModel.validateCoupon(
        code.toUpperCase(),
        tenantId,
        orderValue
      );

      if (result.valid) {
        logger.info("Coupon verified successfully", {
          code,
          tenantId,
          discount: result.discount,
        });
      } else {
        logger.warn("Coupon verification failed", {
          code,
          tenantId,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error("Error verifying coupon", {
        error,
        code: data.code,
        tenantId: data.tenantId,
      });
      throw error;
    }
  }

  async applyCoupon(couponId: string): Promise<boolean> {
    try {
      const result = await this.couponModel.findByIdAndUpdate(
        couponId,
        {
          $inc: { usedCount: 1 },
        },
        { new: true }
      );

      if (!result) {
        throw (createHttpError(404, "Coupon not found"));
      }

      logger.info("Coupon applied successfully", {
        couponId,
        usedCount: result.usedCount,
      });

      return true;
    } catch (error) {
      logger.error("Error applying coupon", { error, couponId });
      throw error;
    }
  }

  async getCoupons(
    tenantId: number,
    page: number = 1,
    limit: number = 10,
    filters: { isActive?: boolean; search?: string } = {}
  ) {
    try {
      const skip = (page - 1) * limit;
      const query: FilterQuery<Coupon> = { tenantId };

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: "i" } },
          { code: { $regex: filters.search, $options: "i" } },
        ];
      }

      const [coupons, total] = await Promise.all([
        this.couponModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        this.couponModel.countDocuments(query),
      ]);

      return {
        coupons,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error fetching coupons", { error, tenantId });
      throw error;
    }
  }

  async getCouponById(id: string, tenantId: number): Promise<Coupon | null> {
    try {
      return await this.couponModel.findOne({
        _id: id,
        tenantId,
      })
    } catch (error) {
      logger.error("Error fetching coupon by ID", { error, id, tenantId });
      throw error;
    }
  }

  async updateCoupon(
    id: string,
    tenantId: number,
    data: UpdateCouponRequest
  ): Promise<Coupon | null> {
    try {
      const coupon = await this.couponModel.findOneAndUpdate(
        { _id: id, tenantId },
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!coupon) {
        throw (createHttpError(404, "Coupon not found"));
      }

      logger.info("Coupon updated successfully", {
        couponId: id,
        tenantId,
        updates: Object.keys(data),
      });

      return coupon;
    } catch (error) {
      logger.error("Error updating coupon", { error, id, tenantId });
      throw error;
    }
  }

  async deleteCoupon(id: string): Promise<boolean> {
    try {
      const result = await this.couponModel.deleteOne({
        _id: id
      });

      if (result.deletedCount === 0) {
        throw (createHttpError(404, "Coupon not found"));
      }

      logger.info("Coupon deleted successfully", {
        couponId: id
      });

      return true;
    } catch (error) {
      logger.error("Error deleting coupon", { error, id });
      throw error;
    }
  }

  async deactivateCoupon(id: string, tenantId: number): Promise<Coupon | null> {
    try {
      return await this.updateCoupon(id, tenantId, { isActive: false });
    } catch (error) {
      logger.error("Error deactivating coupon", { error, id, tenantId });
      throw error;
    }
  }
}

// Export singleton instance
export const couponService = new CouponService(couponModel);