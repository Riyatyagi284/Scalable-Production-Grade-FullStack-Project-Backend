import { body } from "express-validator";
import { Attribute } from "./category-types";

export default [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isString()
        .withMessage("Category name should be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("Category name must be 2–50 chars long"),

    body("priceConfiguration")
        .exists()
        .withMessage("Price configuration is required")
        .isObject()
        .withMessage("Price configuration must be an object"),

    body("priceConfiguration.*.priceType")
        .exists()
        .withMessage("Price type is required")
        .isIn(["base", "aditional"])
        .withMessage("priceType must be base or aditional")
        .custom((value: "base" | "aditional") => {
            const validKeys = ["base", "aditional"];
            if (!validKeys.includes(value)) {
                throw new Error(
                    `${value} is invalid attribute for priceType field. Possible values are: [${validKeys.join(
                        ", ", // i.e -> base, addtional
                    )}]`,
                );
            }
            return true;
        }),

    body("priceConfiguration.*.availableOptions")
        .isArray({ min: 1 })
        .withMessage("availableOptions must be a non-empty array"),

    body("priceConfiguration.*.availableOptions.*")
        .isString()
        .trim()
        .notEmpty(),

    body("attributes")
        .isArray({ min: 1 })
        .withMessage("Attributes must be a non-empty array"),

    body("attributes.*.name")
        .trim()
        .notEmpty()
        .withMessage("Attribute name is required"),

    body("attributes.*.widgetType")
        .isIn(["switch", "radio"])
        .withMessage("Invalid widget type"),

    body("attributes.*.availableOptions")
        .isArray({ min: 1 })
        .withMessage("availableOptions must not be empty"),

    body("attributes.*").custom((attr: Attribute) => {
        if (!attr.availableOptions.includes(attr.defaultValue)) {
            throw new Error(
                `defaultValue must be one of availableOptions for ${attr.name}`,
            );
        }

        if (
            attr.widgetType === "switch" &&
            attr.availableOptions.length !== 2
        ) {
            throw new Error(
                `Switch type attribute must have exactly 2 options`,
            );
        }

        return true;
    }),
];

