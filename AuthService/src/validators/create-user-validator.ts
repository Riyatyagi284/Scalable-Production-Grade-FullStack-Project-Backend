import { checkSchema } from "express-validator";

export default checkSchema({
    email: {
        trim: true,
        errorMessage: "Email is required!",
        notEmpty: true,
        isEmail: {
            errorMessage: "Email should be a valid email",
        },
    },
    firstName: {
        errorMessage: "First name is required!",
        notEmpty: true,
        trim: true,
    },
    lastName: {
        errorMessage: "Last name is required!",
        notEmpty: true,
        trim: true,
    },
    password: {
        trim: true,
        errorMessage: "Password is required!",
        notEmpty: true,
        isLength: {
            options: {
                min: 8,
            },
            errorMessage: "Password length should be at least 8 chars!",
        },
    },
    role: {
        errorMessage: "Role is required!",
        notEmpty: true,
        trim: true,
    },
    tenantId: {
        errorMessage: "tenant id is required!",
        custom: {
            options: (value, { req }) => {
                // const role: string = req.body.role;

                const body = req.body as { role?: string; tenantId?: number };
                const role = body.role;

                if (role === "admin") return true;

                if (!value) {
                    throw new Error("tenantId is required for non-admin users");
                }

                if (isNaN(Number(value))) {
                    throw new Error("tenantId must be a valid number");
                }

                return true;
            },
        },
    },
});
