import { body } from "express-validator";
import mongoose from "mongoose";
import { PriceConfiguration } from "./product-types";
// import fileUpload from "express-fileupload";

export default [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Product name is required")
        .isString()
        .withMessage("Product name must be a string")
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage("Product name must be between 2 and 200 characters"),

    body("description")
        .exists({ checkFalsy: true })
        .withMessage("Description is required")
        .isString()
        .withMessage("Description must be a string")
        .trim()
        .isLength({ min: 10 })
        .withMessage("Description must be at least 10 characters long"),

    body("priceConfiguration")
        .exists()
        .withMessage("Price configuration is required")
        .isObject()
        .withMessage("Price configuration must be an object")
        .custom((value: unknown) => {
            if (typeof value !== "object" || value === null) {
                throw new Error("Price configuration must be an object");
            }

            const priceConfig = value as PriceConfiguration;

            for (const key of Object.keys(priceConfig)) {
                const config = priceConfig[key];

                if (!["base", "aditional"].includes(config.priceType)) {
                    throw new Error(
                        `Invalid priceType for ${key}. Allowed: base, aditional`,
                    );
                }

                if (
                    typeof config.availableOptions !== "object" ||
                    Array.isArray(config.availableOptions)
                ) {
                    throw new Error(
                        `availableOptions for ${key} must be an object`,
                    );
                }

                for (const option in config.availableOptions) {
                    if (typeof config.availableOptions[option] !== "number") {
                        throw new Error(
                            `Price for ${option} in ${key} must be a number`,
                        );
                    }
                }
            }
            return true;
        }),

    body("attributes")
        .exists()
        .withMessage("Attributes field is required")
        .isArray({ min: 1 })
        .withMessage("Attributes must be a non-empty array"),

    body("attributes.*.name")
        .exists({ checkFalsy: true })
        .withMessage("Attribute name is required")
        .isString()
        .withMessage("Attribute name must be a string"),

    body("attributes.*.value")
        .exists()
        .withMessage("Attribute value is required"),

    body("tenantId")
        .exists({ checkFalsy: true })
        .withMessage("Tenant id is required")
        .isString()
        .withMessage("Tenant id must be a string"),

    body("categoryId")
        .exists({ checkFalsy: true })
        .withMessage("Category id is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid category id"),

    // body("image").custom((_, { req }) => {
    //     if (!req.files) {
    //         throw new Error("Product image is required");
    //     }

    //     const files = req.files as fileUpload.FileArray;

    //     const image = files.image;

    //     if (!image) {
    //         throw new Error("Product image is required");
    //     }

    //     if (Array.isArray(image)) {
    //         throw new Error("Only one image is allowed");
    //     }

    //     const uploadedImage = image;

    //     // validate mimetype
    //     if (!uploadedImage.mimetype.startsWith("image/")) {
    //         throw new Error("Uploaded file must be an image");
    //     }

    //     return true;
    // }),
];
