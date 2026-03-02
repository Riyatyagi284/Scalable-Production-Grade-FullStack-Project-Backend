import mongoose, { Schema } from "mongoose";
import { Coupon, ValidateCouponResponse } from "./couponTypes";
import { Model } from "mongoose";

//types  
export interface CouponDocument extends Coupon {}

export interface CouponModel extends Model<CouponDocument> {
  validateCoupon(
    code: string,
    tenantId: number,
    orderValue: number
  ): Promise<ValidateCouponResponse>;
}

// schema
const couponSchema = new Schema<CouponDocument>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      minlength: [4, "Coupon code must be at least 4 characters long"],
      maxlength: [20, "Coupon code cannot exceed 20 characters"],
      match: [/^[A-Z0-9_-]+$/, "Coupon code can only contain letters, numbers, hyphens and underscores"],
    },
    validUpto: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function(value: Date) {
          return value > new Date();
        },
        message: "Expiry date must be in the future",
      },
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
      min: [1, "Discount must be at least 1%"],
      max: [100, "Discount cannot exceed 100%"],
    },
    tenantId: {
      type: Number,
      required: [true, "Tenant ID is required"],
      min: [1, "Tenant ID must be positive"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    }
    // createdBy: {
    //   type: Number,
    //   ref: "User",
    //   required: true,
    // },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for unique coupon codes per tenant
couponSchema.index({ tenantId: 1, code: 1 }, { unique: true });

// Index for active coupons lookup
couponSchema.index({ tenantId: 1, isActive: 1, validUpto: 1 });

// Virtual for checking if coupon is expired
couponSchema.virtual("isExpired").get(function() {
  return new Date() > this.validUpto;
});

// Virtual for checking if coupon usage limit reached
couponSchema.virtual("isUsageLimitReached").get(function() {
  return this.usageLimit !== null && this.usedCount >= this.usageLimit;
});

// Pre-save middleware to uppercase code
couponSchema.pre("save", function(next) {
  if (this.isModified("code")) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Static method to validate coupon
couponSchema.statics.validateCoupon = async function(
  code: string,
  tenantId: number,
  orderValue: number = 0
): Promise<ValidateCouponResponse> {
  const coupon = await this.findOne({
    code,
    tenantId,
    isActive: true,
    validUpto: { $gt: new Date() },
  });

  if (!coupon) {
    return { valid: false, error: "Invalid or expired coupon" };
  }

  if (coupon.isUsageLimitReached) {
    return { valid: false, error: "Coupon usage limit reached" };
  }

  if (orderValue < coupon.minOrderValue) {
    return {
      valid: false,
      error: `Minimum order value of ${coupon.minOrderValue} required`,
    };
  }

  return {
    valid: true,
    discount: coupon.discount,
    couponId: coupon._id,
    minOrderValue: coupon.minOrderValue,
  };
};

export default mongoose.model<CouponDocument,CouponModel>("Coupon", couponSchema);