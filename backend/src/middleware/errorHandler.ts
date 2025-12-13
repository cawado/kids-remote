import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Handle known operational errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    // Log unexpected errors
    console.error('Unexpected error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    // Don't leak error details in production
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};

/**
 * Async route handler wrapper to catch errors
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
