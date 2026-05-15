"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
function sendSuccess(response, data, statusCode = 200) {
    return response.status(statusCode).json({
        success: true,
        data,
    });
}
