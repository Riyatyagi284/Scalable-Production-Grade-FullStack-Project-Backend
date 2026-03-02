import {
  ValidationError,
  AlternativeValidationError,
} from "express-validator";

type Err = ValidationError | AlternativeValidationError;

function getErrorField(err: Err): string {
  if ("path" in err && typeof err.path === "string") {
    return err.path;
  }
  if ("param" in err && typeof err.param === "string") {
    return err.param;
  }
  return "unknown"; 
}


import { orderSchema } from "../order-validator/create-validator";
import { validationResult, ContextRunner } from "express-validator";
import { OrderRequestBody } from "../orderTypes";

interface FakeRequest<T> {
  body: T;
}

export const validateOrderRequest = async (data: OrderRequestBody) => {
  const req: FakeRequest<OrderRequestBody> = { body: data };

  for (const rule of orderSchema as unknown as ContextRunner[]) {
    await rule.run(req);
  }

  const result = validationResult(req);

  if (result.isEmpty()) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errors: result.array().map((err) => ({
      field: getErrorField(err),
      message: err.msg,
    })),
  };
};
