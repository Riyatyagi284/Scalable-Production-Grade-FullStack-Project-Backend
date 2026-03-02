import mongoose from "mongoose";
import { Attribute } from "../category/category-types";

export type PriceConfig = {
    priceType: "base" | "aditional";
    availableOptions: Record<string, number>;
};

export type PriceConfiguration = Record<string, PriceConfig>;

export interface Product {
    _id?: mongoose.Types.ObjectId;
    name: string;
    description: string;
    priceConfiguration: PriceConfiguration;
    attributes: Attribute;
    tenantId: string;
    categoryId: string;
    isPublish: boolean;
    // image: string;
}

export interface Filter {
    tenantId?: string;
    categoryId?: mongoose.Types.ObjectId;
    isPublish?: boolean;
}

export interface PaginateQuery {
    page: number;
    limit: number;
}

export enum ProductEvents {
    PRODUCT_CREATE = "PRODUCT_CREATE",
    PRODUCT_UPDATE = "PRODUCT_UPDATE",
    PRODUCT_DELETE = "PRODUCT_DELETE",
}