import express, {
    NextFunction,
    Request,
    RequestHandler,
    Response,
} from "express";
import { TenantController } from "../controllers/TenantController";
import { TenantService } from "../services/TenantService";
import { AppDataSource } from "../config/data-source";
import { Tenant } from "../entity/Tenant";
import logger from "../config/logger";
import authenticate from "../middlewares/authenticate";
import { canAccess } from "../middlewares/canAccess";
import { Roles } from "../constants";
import tenantValidator from "../validators/tenant-validator";
import { CreateTenantRequest } from "../types";
import listUsersValidator from "../validators/list-users-validator";
import { User } from "../entity/User";
import { UserService } from "../services/UserService";

const router = express.Router();

const tenantRepository = AppDataSource.getRepository(Tenant);
const userRepository = AppDataSource.getRepository(User);
const tenantService = new TenantService(tenantRepository);
const userService = new UserService(userRepository, tenantRepository);

const tenantController = new TenantController(
    tenantService,
    logger,
    userService,
);

router.post(
    "/",
    authenticate as RequestHandler,
    canAccess([Roles.ADMIN]),
    tenantValidator,
    (req: Request, res: Response, next: NextFunction) => {
        tenantController.create(
            req as CreateTenantRequest,
            res,
            next,
        ) as unknown as RequestHandler;
    },
);

router.patch(
    "/:id",
    authenticate as RequestHandler,
    canAccess([Roles.ADMIN]),
    tenantValidator,
    (req: Request, res: Response, next: NextFunction) =>
        tenantController.update(
            req as CreateTenantRequest,
            res,
            next,
        ) as unknown as RequestHandler,
);
router.get(
    "/",
    listUsersValidator,
    (req: Request, res: Response, next: NextFunction) =>
        tenantController.getAll(req, res, next) as unknown as RequestHandler,
);
router.get(
    "/:id",
    authenticate as RequestHandler,
    canAccess([Roles.ADMIN]),
    (req, res, next) =>
        tenantController.getOne(req, res, next) as unknown as RequestHandler,
);
router.delete(
    "/:id",
    authenticate as RequestHandler,
    canAccess([Roles.ADMIN]),
    (req, res, next) =>
        tenantController.destroy(req, res, next) as unknown as RequestHandler,
);

export default router;
