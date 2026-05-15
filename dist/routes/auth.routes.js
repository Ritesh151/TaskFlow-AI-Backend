"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../lib/response");
const cookies_1 = require("../utils/cookies");
const auth_service_1 = require("../services/auth.service");
const auth_validator_1 = require("../validators/auth.validator");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', (0, validate_1.validate)({ body: auth_validator_1.loginSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const result = await (0, auth_service_1.loginUser)(request.body.email, request.body.password, {
        ipAddress: request.ip,
        userAgent: request.get('user-agent') ?? undefined,
    });
    (0, cookies_1.setAuthCookies)(response, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
    });
    return (0, response_1.sendSuccess)(response, result.payload);
}));
exports.authRouter.post('/refresh', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const refreshToken = request.signedCookies?.[cookies_1.REFRESH_COOKIE_NAME];
    const result = await (0, auth_service_1.refreshUserSession)(refreshToken ?? '', {
        ipAddress: request.ip,
        userAgent: request.get('user-agent') ?? undefined,
    });
    (0, cookies_1.setAuthCookies)(response, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
    });
    return (0, response_1.sendSuccess)(response, result.payload);
}));
exports.authRouter.post('/logout', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const refreshToken = request.signedCookies?.[cookies_1.REFRESH_COOKIE_NAME];
    await (0, auth_service_1.logoutUser)(refreshToken);
    (0, cookies_1.clearAuthCookies)(response);
    return (0, response_1.sendSuccess)(response, { loggedOut: true });
}));
exports.authRouter.get('/me', authenticate_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authRequest = request;
    const session = await (0, auth_service_1.getCurrentSession)(authRequest.auth?.sub ?? '', authRequest.auth);
    return (0, response_1.sendSuccess)(response, session);
}));
