"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiNotFound = apiNotFound;
exports.healthPayload = healthPayload;
exports.sendHealth = sendHealth;
const response_1 = require("../lib/response");
function apiNotFound(request, response) {
    return response.status(404).json({
        success: false,
        message: `Cannot ${request.method} ${request.originalUrl}`,
        code: 'NOT_FOUND',
    });
}
function healthPayload(status) {
    return {
        status,
        timestamp: new Date().toISOString(),
    };
}
function sendHealth(response, status) {
    return (0, response_1.sendSuccess)(response, healthPayload(status));
}
