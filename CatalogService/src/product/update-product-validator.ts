import { body, param } from "express-validator";

export default [
    param("productId")
        .exists()
        .withMessage("Product ID is required")
        .isMongoId()
        .withMessage("Invalid product ID format"),
    body("name")
        .optional()
        .exists()
        .withMessage("Product name is required")
        .isString()
        .withMessage("Product name should be a string"),
    body("description")
        .optional()
        .exists()
        .withMessage("Description is required"),
    body("priceConfiguration")
        .optional()
        .exists()
        .withMessage("Price configuration is required"),
    body("attributes")
        .optional()
        .exists()
        .withMessage("Attributes field is required"),
    body("tenantId")
        .optional()
        .exists()
        .withMessage("Tenant id field is required"),
    body("categoryId")
        .optional()
        .exists()
        .withMessage("Category id field is required"),
];
