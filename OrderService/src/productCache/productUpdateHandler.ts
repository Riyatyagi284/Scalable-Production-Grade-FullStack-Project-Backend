import { ProductMessage } from "../types";
import productCacheModel from "./productCacheModel";

export const handleProductUpdate = async (value: string) => {
  let product: ProductMessage;
  try {
    product = JSON.parse(value);
  } catch (err) {
    console.error("Failed to parse product message:", value, err);
    return; // Save from crashing consumer .
  }

  if (!product?.data?.id) {
    console.error("Invalid product message — missing data.id:", product);
    return;
  }

  try {
    return await productCacheModel.updateOne(
      {
        productId: product.data.id,
      },
      {
        $set: {
          priceConfiguration: product.data.priceConfiguration,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("Failed to update product cache:", err);
  }
};
