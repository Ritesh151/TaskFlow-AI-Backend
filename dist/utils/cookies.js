"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_COOKIE_NAME = exports.ACCESS_COOKIE_NAME = void 0;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const env_1 = require("../config/env");
exports.ACCESS_COOKIE_NAME = 'tf_access';
exports.REFRESH_COOKIE_NAME = 'tf_refresh';
const baseCookie = {
    httpOnly: true,
    secure: env_1.env.IS_PRODUCTION,
    sameSite: 'strict',
    signed: true,
    path: '/',
};
function setAuthCookies(response, payload) {
    response.cookie(exports.ACCESS_COOKIE_NAME, payload.accessToken, {
        ...baseCookie,
        maxAge: env_1.env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
    });
    response.cookie(exports.REFRESH_COOKIE_NAME, payload.refreshToken, {
        ...baseCookie,
        maxAge: env_1.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
}
function clearAuthCookies(response) {
    response.clearCookie(exports.ACCESS_COOKIE_NAME, baseCookie);
    response.clearCookie(exports.REFRESH_COOKIE_NAME, baseCookie);
}
