"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../config/logger");
const errors_1 = require("../lib/errors");
function errorHandler(error, request, response, _next) {
    if ((0, errors_1.isAppError)(error)) {
        if (error.statusCode >= 500) {
            logger_1.logger.error({
                err: error,
                method: request.method,
                url: request.originalUrl,
            }, 'Application error');
        }
        response.status(error.statusCode).json({
            success: false,
            message: error.expose ? error.message : 'Internal server error',
            code: error.code,
            details: error.expose ? error.details : undefined,
        });
        return;
    }
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        response.status(409).json({
            success: false,
            message: 'A record with the same unique value already exists.',
            code: 'CONFLICT',
        });
        return;
    }
    const normalizedError = error instanceof Error ? error : new errors_1.AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
    logger_1.logger.error({
        err: normalizedError,
        method: request.method,
        url: request.originalUrl,
    }, 'Unhandled request error');
    response.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
    });
}
