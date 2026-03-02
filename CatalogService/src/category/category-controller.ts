import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import {
    Category,
    PriceConfiguration,
    validateAttributes,
    validatePriceConfiguration,
} from "./category-types";
import { CategoryService } from "./category-service";
import { Logger } from "winston";

export class CategoryController {
    constructor(
        private categoryService: CategoryService,
        private logger: Logger,
    ) {
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.index = this.index.bind(this);
        this.getOne = this.getOne.bind(this);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }
        const { name, priceConfiguration, attributes } = req.body as Category;

        const category = await this.categoryService.create({
            name,
            priceConfiguration,
            attributes,
        });

        this.logger.info(`Created category`, { id: category._id });
        res.json({ id: category._id });
    }

    async update(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }

        const categoryId = req.params.id;
        const updateData = req.body as Partial<Category>;
        
        const existingCategory = await this.categoryService.getOne(categoryId);

        if (!existingCategory) {
            return next(createHttpError(404, "Category not found"));
        }

        if (updateData.priceConfiguration) {
            // Convert existing Map to object if it's a Map
            const existingConfig =
                existingCategory.priceConfiguration instanceof Map
                    ? Object.fromEntries(existingCategory.priceConfiguration)
                    : existingCategory.priceConfiguration;

  
            const mergedConfig: PriceConfiguration = {
                ...existingConfig,
                ...updateData.priceConfiguration,
            };

            try {
                validatePriceConfiguration(mergedConfig);
            } catch (err) {
                return next(createHttpError(400, (err as Error).message));
            }

            updateData.priceConfiguration = mergedConfig;
        }

        if (updateData.attributes) {
            try {
                validateAttributes(updateData.attributes);
            } catch (err) {
                return next(createHttpError(400, (err as Error).message));
            }
        }

        const updatedCategory = await this.categoryService.update(
            categoryId,
            updateData,
        );

        this.logger.info(`Updated category`, { id: categoryId });

        res.json({
            id: updatedCategory?._id,
        });
    }

    async index(req: Request, res: Response) {
        const categories = await this.categoryService.getAll();
        this.logger.info(`Getting categories list`);
        res.json(categories);
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return next(createHttpError(400, result.array()[0].msg as string));
        }

        const { categoryId } = req.params;
        const category = await this.categoryService.getOne(categoryId);
        if (!category) {
            return next(createHttpError(404, "Category not found"));
        }
        this.logger.info(`Getting category`, { id: category._id });
        res.json(category);
    }
}
