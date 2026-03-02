import { NextFunction, Response, Request } from "express";
// import { UploadedFile } from "express-fileupload";
// import { v4 as uuidv4 } from "uuid";
// import { FileStorage } from "../common/types/storage";
import { ToppingService } from "./topping-service";
import { CreateRequestBody, Topping, ToppingEvents } from "./topping-types";
import { MessageProducerBroker } from "../common/types/broker";
import config from "config";
import { Logger } from "winston";

export class ToppingController {
    constructor(
        // private storage: FileStorage,
        private toppingService: ToppingService,
        private broker: MessageProducerBroker,
        private logger: Logger,
    ) {}

    create = async (
        req: Request<object, object, CreateRequestBody>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            // const image = req.files!.image as UploadedFile;

            // if (!image) {
            //     this.logger.error("Image file missing in request.");
            //     return res.status(400).json({ message: "Image is required." });
            // }

            // const fileUuid = uuidv4();

            // // file upload
            // try {
            //     await this.storage.upload({
            //         filename: fileUuid,
            //         fileData: image.data,
            //     });
            // } catch (uploadError) {
            //     this.logger.error("File upload failed", {
            //         error:
            //             uploadError instanceof Error
            //                 ? uploadError.message
            //                 : uploadError,
            //     });

            //     return res.status(500).json({
            //         message: "Failed to upload image. Please try again.",
            //     });
            // }

            // DB create
            let savedTopping: Topping;
            try {
                savedTopping = await this.toppingService.create({
                    ...req.body,
                    // image: fileUuid,
                    tenantId: req.body.tenantId,
                } as Topping);
            } catch (dbError) {
                this.logger.error("Topping creation failed", {
                    body: req.body,
                    error: dbError instanceof Error ? dbError.message : dbError,
                });

                return res.status(500).json({
                    message: "Failed to save topping. Please try again.",
                });
            }

            // Add log after create
            this.logger.info("Topping created successfully", {
                id: savedTopping._id,
                tenantId: savedTopping.tenantId,
                price: savedTopping.price,
                // image: fileUuid,
            });

            // Send topping to kafka.
            const TOPPING_TOPIC = config.get<string>("kafka.topics.topping");

            await this.broker.sendMessage(
                TOPPING_TOPIC,
                JSON.stringify({
                    event_type: ToppingEvents.TOPPING_CREATE,
                    data: {
                        id: savedTopping._id,
                        price: savedTopping.price,
                        tenantId: savedTopping.tenantId,
                    },
                }),
            );

            res.json({ id: savedTopping._id });
        } catch (err) {
            return next(err);
        }
    };

    get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const toppings = await this.toppingService.getAll(
                req.query.tenantId as string,
            );

            if (!toppings || !Array.isArray(toppings)) {
                this.logger.error(
                    "Failed to fetch toppings or invalid data format",
                    {
                        tenantId: req.query.tenantId,
                        toppings,
                    },
                );

                return res.status(500).json({
                    message: "Unable to fetch toppings. Please try again.",
                });
            }

            const readyToppings = toppings
                .map((topping) => {
                    try {
                        return {
                            id: topping._id,
                            name: topping.name,
                            price: topping.price,
                            tenantId: topping.tenantId,
                            // image: this.storage.getObjectUri(topping.image),
                        };
                    } catch (mapError) {
                        this.logger.error("Failed to map topping data", {
                            topping,
                            error:
                                mapError instanceof Error
                                    ? mapError.message
                                    : mapError,
                        });

                        return null;
                    }
                })
                .filter(Boolean);

            this.logger.info("Fetched toppings successfully", {
                tenantId: req.query.tenantId,
                count: readyToppings.length,
            });

            res.json(readyToppings);
        } catch (err) {
            this.logger.error("Unhandled error in toppings get handler", {
                tenantId: req.query.tenantId,
                error: err instanceof Error ? err.message : err,
            });
            return next(err);
        }
    };
}
