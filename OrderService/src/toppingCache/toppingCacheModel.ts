import mongoose from "mongoose";
import { ToppingPriceCache } from "../types";

const toppingCacheSchama = new mongoose.Schema<ToppingPriceCache>(
  {
    toppingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

toppingCacheSchama.index({ toppingId: 1 }, { unique: true });

export default mongoose.model(
  "ToppingPricingCache",
  toppingCacheSchama,
  "toppingCache",
);
