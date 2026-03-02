import { param } from "express-validator";

export const getCategoryValidator = [
    param("categoryId")
        .exists()
        .withMessage("Category ID is required")
        .isMongoId()
        .withMessage("Invalid category ID format")
        .trim(),
];
