"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const cookies_1 = require("../utils/cookies");
const tokens_1 = require("../utils/tokens");
async function requireAuth(request, _response, next) {
    try {
        const accessToken = request.signedCookies?.[cookies_1.ACCESS_COOKIE_NAME];
        if (!accessToken) {
            throw (0, errors_1.unauthorized)();
        }
        const payload = (0, tokens_1.verifyAccessToken)(accessToken);
        const session = await prisma_1.prisma.session.findUnique({
            where: { id: payload.sessionId },
        });
        if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
            throw (0, errors_1.unauthorized)('Session expired');
        }
        const authRequest = request;
        authRequest.auth = payload;
        authRequest.session = session;
        next();
    }
    catch (error) {
        next(error);
    }
}
