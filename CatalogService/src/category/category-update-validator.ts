import { body, param } from "express-validator";
import { Attribute } from "./category-types";

export default [
    param("id")
        .exists()
        .withMessage("Category ID is required")
        .isMongoId()
        .withMessage("Invalid category ID format"),

    body().custom((value) => {
        const allowedKeys = ["name", "priceConfiguration", "attributes"];
        const keys = Object.keys(value).filter((k) => allowedKeys.includes(k));

        if (keys.length === 0) {
            throw new Error("At least one updatable field is required");
        }
        return true;
    }),

    body("name")
        .optional()
        .isString()
        .withMessage("Category name should be a string")
        .trim()
        .notEmpty()
        .withMessage("Category name cannot be empty")
        .isLength({ min: 2, max: 50 }),

    body("priceConfiguration")
        .optional()
        .isObject()
        .withMessage("Price configuration must be an object")
        .custom((value) => {
            if (Object.keys(value).length === 0) {
                throw new Error("Price configuration cannot be empty");
            }
            return true;
        }),

    body("priceConfiguration.*.priceType")
        .optional()
        .isIn(["base", "aditional"])
        .withMessage("Invalid priceType"),

    body("priceConfiguration.*.availableOptions")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Available options should be a non empty array"),

    body("priceConfiguration.*.availableOptions.*")
        .optional()
        .isString()
        .trim()
        .notEmpty(),

    body("attributes")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Attributes must be a non-empty array"),

    body("attributes.*.name")
        .optional()
        .isString()
        .withMessage("Attribute name should be a string")
        .trim()
        .notEmpty()
        .withMessage("Attribute name cannot be empty"),

    body("attributes.*.widgetType")
        .optional()
        .isIn(["switch", "radio"])
        .withMessage("Invalid widgetType"),

    body("attributes.*.defaultValue")
        .optional()
        .notEmpty()
        .withMessage("Default value is required for attributes"),

    body("attributes.*.availableOptions")
        .optional()
        .isArray({ min: 1 })
        .withMessage("availableOptions must be a non-empty array"),

    body("attributes.*")
        .optional()
        .custom((attr: Attribute) => {
            // ist condition
            if (
                attr.availableOptions &&
                attr.defaultValue &&
                !attr.availableOptions.includes(attr.defaultValue)
            ) {
                throw new Error(
                    `defaultValue must be one of availableOptions for ${attr.name}`,
                );
            }

            // iind condition
            if (
                attr.widgetType === "switch" &&
                attr.availableOptions?.length !== 2
            ) {
                throw new Error(
                    `Switch attribute '${attr.name}' must have exactly 2 options`,
                );
            }

            return true;
        }),
];
