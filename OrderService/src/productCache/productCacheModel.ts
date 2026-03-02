import mongoose from "mongoose";
import { ProductPricingCache } from "../types";

const priceSchema = new mongoose.Schema({
  priceType: {
    type: String,
    enum: ["base", "aditional"],
  },
  availableOptions: {
    type: Object,
    of: Number,
  },
});

const productCacheSchema = new mongoose.Schema<ProductPricingCache>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  priceConfiguration: {
    type: Object,
    of: priceSchema,
  },
});

export default mongoose.model(
  "ProductPricingCache",
  productCacheSchema,
  "productCache",
);
