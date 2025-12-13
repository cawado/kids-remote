"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Middleware factory to validate request body against a Zod schema
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
                next(new errorHandler_1.AppError(400, `Validation error: ${messages.join(', ')}`));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateBody = validateBody;
/**
 * Middleware factory to validate query parameters against a Zod schema
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req.query);
            req.query = parsed; // Type assertion needed for Express query type
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
                next(new errorHandler_1.AppError(400, `Validation error: ${messages.join(', ')}`));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateQuery = validateQuery;
