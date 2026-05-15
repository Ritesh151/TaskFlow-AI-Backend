"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSeedUser = ensureSeedUser;
exports.loginUser = loginUser;
exports.refreshUserSession = refreshUserSession;
exports.logoutUser = logoutUser;
exports.getCurrentSession = getCurrentSession;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const hash_1 = require("../utils/hash");
const tokens_1 = require("../utils/tokens");
function accessExpiresAt() {
    return new Date(Date.now() + env_1.env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000);
}
function refreshExpiresAt() {
    return new Date(Date.now() + env_1.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
}
function buildSessionPayload(user, accessExpiry, session) {
    return {
        user: serializeUser(user),
        accessTokenExpiresAt: accessExpiry.toISOString(),
        refreshTokenExpiresAt: session.expiresAt.toISOString(),
    };
}
async function issueSession(user, context, existingSessionId) {
    const accessExpiry = accessExpiresAt();
    const refreshExpiry = refreshExpiresAt();
    const sessionId = existingSessionId ?? (0, node_crypto_1.randomUUID)();
    const refreshToken = (0, tokens_1.signRefreshToken)(user.id, user.email, sessionId);
    const accessToken = (0, tokens_1.signAccessToken)(user.id, user.email, sessionId);
    const sessionData = {
        userId: user.id,
        refreshTokenHash: (0, hash_1.sha256)(refreshToken),
        expiresAt: refreshExpiry,
        revokedAt: null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
    };
    const session = existingSessionId
        ? await prisma_1.prisma.session.update({
            where: { id: sessionId },
            data: sessionData,
        })
        : await prisma_1.prisma.session.create({
            data: {
                id: sessionId,
                ...sessionData,
            },
        });
    return {
        accessToken,
        refreshToken,
        payload: buildSessionPayload(user, accessExpiry, session),
    };
}
async function ensureSeedUser() {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: env_1.env.SEED_USER_EMAIL.toLowerCase() },
    });
    if (existing) {
        return existing;
    }
    const passwordHash = await bcryptjs_1.default.hash(env_1.env.SEED_USER_PASSWORD, env_1.env.BCRYPT_SALT_ROUNDS);
    return prisma_1.prisma.user.create({
        data: {
            email: env_1.env.SEED_USER_EMAIL.toLowerCase(),
            name: env_1.env.SEED_USER_NAME,
            passwordHash,
            role: 'owner',
        },
    });
}
async function loginUser(email, password, context) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });
    if (!user) {
        logger_1.authLogger.warn({ email }, 'Login failed: user not found');
        throw (0, errors_1.unauthorized)('Invalid email or password');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        logger_1.authLogger.warn({ email }, 'Login failed: password mismatch');
        throw (0, errors_1.unauthorized)('Invalid email or password');
    }
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    logger_1.authLogger.info({ userId: user.id, email: user.email }, 'Login succeeded');
    return issueSession(user, context);
}
async function refreshUserSession(refreshToken, context) {
    const payload = (0, tokens_1.verifyRefreshToken)(refreshToken);
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
        throw (0, errors_1.unauthorized)('Refresh session expired');
    }
    if (session.refreshTokenHash !== (0, hash_1.sha256)(refreshToken)) {
        await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });
        throw (0, errors_1.unauthorized)('Refresh session invalidated');
    }
    logger_1.authLogger.info({ userId: session.user.id, sessionId: session.id }, 'Refreshing session');
    return issueSession(session.user, context, session.id);
}
async function logoutUser(refreshToken) {
    if (!refreshToken) {
        return;
    }
    try {
        const payload = (0, tokens_1.verifyRefreshToken)(refreshToken);
        await prisma_1.prisma.session.updateMany({
            where: {
                id: payload.sessionId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
        logger_1.authLogger.info({ sessionId: payload.sessionId, userId: payload.sub }, 'Session logged out');
    }
    catch {
        logger_1.authLogger.warn('Logout called with invalid refresh token');
    }
}
async function getCurrentSession(userId, auth) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw (0, errors_1.notFound)('User not found');
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: auth.sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
        throw (0, errors_1.unauthorized)('Session expired');
    }
    const accessExpiry = auth.exp ? new Date(auth.exp * 1000) : accessExpiresAt();
    return buildSessionPayload(user, accessExpiry, session);
}
