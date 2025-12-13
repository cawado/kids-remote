"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
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
exports.errorHandler = errorHandler;
/**
 * Async route handler wrapper to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
