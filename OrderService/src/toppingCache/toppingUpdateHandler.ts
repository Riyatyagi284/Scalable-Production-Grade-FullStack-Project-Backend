import { ToppingMessage } from "../types";
import toppingCacheModel from "./toppingCacheModel";

export const handleToppingUpdate = async (value: string) => {
  let topping: ToppingMessage;

  try {
    topping = JSON.parse(value);
  } catch (err) {
    console.error("Failed to parse topping message:", value, err);
    return; // Save from crashing consumer .
  }

  if (!topping?.data?.id) {
    console.error("Invalid topping message — missing data.id:", topping);
    return;
  }

  try {
    return await toppingCacheModel.updateOne(
      { toppingId: topping.data.id },
      {
        $set: {
          price: topping.data.price,
          tenantId: topping.data.tenantId,
        },
      },
      { upsert: true },
    );

  } catch (err) {
    console.error("Failed to update topping cache:", err);
  }
};
