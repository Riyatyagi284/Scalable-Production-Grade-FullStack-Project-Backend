import { NextFunction, Response } from "express";
import { Request } from "express-jwt";
// import { v4 as uuidv4 } from "uuid";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { ProductService } from "./product-service";
import { Filter, Product, ProductEvents } from "./product-types";
// import { FileStorage } from "../common/types/storage";
// import { UploadedFile } from "express-fileupload";
import { AuthRequest } from "../common/types";
import { Roles } from "../common/constants";
import mongoose from "mongoose";
import { MessageProducerBroker } from "../common/types/broker";
import { mapToObject } from "../utils";
import config from "config";
import { Logger } from "winston";

export class ProductController {
    constructor(
        private productService: ProductService,
        // private storage: FileStorage,
        private broker: MessageProducerBroker,
        private logger: Logger,
    ) {}

    create = async (req: Request, res: Response, next: NextFunction) => {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }

        // if (
        //     !req.files ||
        //     typeof req.files !== "object" ||
        //     !("image" in req.files)
        // ) {
        //     throw createHttpError(400, "Product image is required");
        // }

        // const image = req.files.image as UploadedFile;

        // if (Array.isArray(image)) {
        //     throw createHttpError(400, "Only one image is allowed");
        // }

        // const imageExt = image.name.split(".").pop();
        // const imageName = `${uuidv4()}.${imageExt}`;

        // body
        const body = req.body as Product;

        if (
            typeof body !== "object" ||
            body === null ||
            !("priceConfiguration" in body) ||
            !("attributes" in body)
        ) {
            throw createHttpError(400, "Invalid request body");
        }

        // s3 upload
        // await this.storage.upload({
        //     filename: imageName,
        //     fileData: image.data,
        // });

        const { name, description, tenantId, categoryId, isPublish, priceConfiguration, attributes  } = body;

        const product = {
            name,
            description,
            priceConfiguration,
            attributes,
            tenantId,
            categoryId,
            isPublish,
            // image: imageName,
        };

        const newProduct = await this.productService.createProduct(
            product as unknown as Product,
        );

        // Send product to kafka.
        const PRODUCT_TOPIC = config.get<string>("kafka.topics.product");

        await this.broker
            .sendMessage(
                PRODUCT_TOPIC,
                JSON.stringify({
                    event_type: ProductEvents.PRODUCT_CREATE,
                    data: {
                        id: newProduct._id,

                        priceConfiguration: mapToObject(
                            newProduct.priceConfiguration as unknown as Map<
                                string,
                                unknown
                            >,
                        ),
                    },
                }),
            )
            .catch((err) => {
                this.logger.error("Kafka publish failed", err);
            });

        res.json({ id: newProduct._id });
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }

        const { productId } = req.params;

        const product = await this.productService.getProduct(productId);
        if (!product) {
            return next(createHttpError(404, "Product not found"));
        }

        if ((req as AuthRequest).auth.role !== Roles.ADMIN) {
            const tenant = (req as AuthRequest).auth.tenant;
            if (product.tenantId !== tenant) {
                return next(
                    createHttpError(
                        403,
                        "You are not allowed to access this product",
                    ),
                );
            }
        }

        // let imageName: string | undefined;
        // let oldImage: string | undefined;

        // if (req.files?.image) {
        //     oldImage = product.image;

        //     const image = req.files.image as UploadedFile;
        //     imageName = uuidv4();

        //     await this.storage.upload({
        //         filename: imageName,
        //         fileData: image.data,
        //     });

        //     await this.storage.delete(oldImage);
        // }

        const {
            name,
            description,
            priceConfiguration,
            attributes,
            tenantId,
            categoryId,
            isPublish,
        } = req.body;

        const productToUpdate = {
            name,
            description,
            priceConfiguration: priceConfiguration,
            attributes: attributes,
            tenantId,
            categoryId,
            isPublish,
            // image: imageName ? imageName : (oldImage as string),
        };

        const updatedProduct = await this.productService.updateProduct(
            productId,
            productToUpdate,
        );

        // Send product to kafka.
        const PRODUCT_TOPIC = config.get<string>("kafka.topics.product");

        await this.broker.sendMessage(
            PRODUCT_TOPIC,
            JSON.stringify({
                event_type: ProductEvents.PRODUCT_UPDATE,
                data: {
                    id: updatedProduct._id,
                    priceConfiguration: mapToObject(
                        updatedProduct.priceConfiguration as unknown as Map<
                            string,
                            any
                        >,
                    ),
                },
            }),
        );

        res.json({ id: productId });
    };

    index = async (req: Request, res: Response) => {
        const { q, tenantId, categoryId, isPublish } = req.query;

        const filters: Filter = {};

        if (isPublish === "true") {
            filters.isPublish = true;
        }

        if (tenantId) filters.tenantId = tenantId as string;

        if (
            categoryId &&
            mongoose.Types.ObjectId.isValid(categoryId as string)
        ) {
            filters.categoryId = new mongoose.Types.ObjectId(
                categoryId as string,
            );
        }

        // Add Logs
        this.logger.info("Fetching products", {
            query: {
                q,
                tenantId,
                categoryId,
                isPublish,
            },
            filters,
            pagination: {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit
                    ? parseInt(req.query.limit as string)
                    : 10,
            },
        });

        try {
            const products = await this.productService.getProducts(
                q as string,
                filters,
                {
                    page: req.query.page
                        ? parseInt(req.query.page as string)
                        : 1,
                    limit: req.query.limit
                        ? parseInt(req.query.limit as string)
                        : 10,
                },
            );

            this.logger.info("Products fetched successfully", {
                total: products.total,
                page: products.page,
                limit: products.limit,
            });

            const finalProducts = (products.data as Product[]).map(
                (product: Product) => {
                    return {
                        ...product,
                        // image: this.storage.getObjectUri(product.image),
                    };
                },
            );

            res.json({
                data: finalProducts,
                total: products.total,
                pageSize: products.limit,
                currentPage: products.page,
            });
        } catch (error) {
            // Add error logs
            this.logger.error("Failed to fetch products", {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
            });

            res.status(500).json({
                message: "Something went wrong while fetching products.",
            });
        }
    };
}
