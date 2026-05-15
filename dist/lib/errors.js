"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.isAppError = isAppError;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
class AppError extends Error {
    statusCode;
    code;
    details;
    expose;
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details, expose = statusCode < 500) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.expose = expose;
    }
}
exports.AppError = AppError;
function isAppError(error) {
    return error instanceof AppError;
}
function badRequest(message, details) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
}
function unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHORIZED');
}
function forbidden(message = 'Forbidden') {
    return new AppError(message, 403, 'FORBIDDEN');
}
function notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
}
