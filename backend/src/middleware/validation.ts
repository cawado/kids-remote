import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../middleware/errorHandler';

/**
 * Middleware factory to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
                next(new AppError(400, `Validation error: ${messages.join(', ')}`));
            } else {
                next(error);
            }
        }
    };
};

/**
 * Middleware factory to validate query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = schema.parse(req.query);
            req.query = parsed as any; // Type assertion needed for Express query type
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
                next(new AppError(400, `Validation error: ${messages.join(', ')}`));
            } else {
                next(error);
            }
        }
    };
};
