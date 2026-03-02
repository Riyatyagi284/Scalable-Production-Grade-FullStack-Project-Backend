import { Document } from "mongoose";

export interface Coupon extends Document {
  title: string;
  code: string;
  validUpto: Date;
  discount: number;
  tenantId: number;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  minOrderValue: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isExpired: boolean;
  isUsageLimitReached: boolean;
}

export interface ValidateCouponResponse {
  valid: boolean;
  error?: string;
  discount?: number;
  couponId?: string;
  minOrderValue?: number;
}


export interface VerifyCouponRequest {
  code: string;
  tenantId: number;
  orderValue?: number;
}

export interface VerifyCouponResponse {
  valid: boolean;
  discount?: number;
  error?: string;
  couponId?: string;
  minOrderValue?: number;
}

export interface CreateCouponRequest {
  title: string;
  code: string;
  validUpto: Date;
  discount: number;
  tenantId: number;
  usageLimit?: number;
  minOrderValue?: number;
}

export interface UpdateCouponRequest {
  title?: string;
  validUpto?: Date;
  discount?: number;
  isActive?: boolean;
  usageLimit?: number;
  minOrderValue?: number;
}