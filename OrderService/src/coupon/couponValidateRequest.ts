import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";

export const validateRequestBodyData = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map((err) => ({
          field: err.type === "field" ? err.path : err.type,
          message: err.msg,
        }));


        return res.status(400).json({
          status: "fail",
          errors: formattedErrors,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Alternative: Middleware to validate specific parts of request
export const validateBody = (validations: ValidationChain[]) => {
  return validateRequestBodyData(validations);
};

export const validateQuery = (validations: ValidationChain[]) => {
  return validateRequestBodyData(validations);
};

export const validateParams = (validations: ValidationChain[]) => {
  return validateRequestBodyData(validations);
};