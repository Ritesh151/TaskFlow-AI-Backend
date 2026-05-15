"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
function verifyToken(token, expectedType) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (decoded.tokenType !== expectedType) {
            throw (0, errors_1.unauthorized)('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof Error) {
            throw (0, errors_1.unauthorized)(error.message === 'jwt expired' ? 'Session expired' : 'Invalid session token');
        }
        throw (0, errors_1.unauthorized)('Invalid session token');
    }
}
function signAccessToken(userId, email, sessionId) {
    return jsonwebtoken_1.default.sign({
        sub: userId,
        email,
        sessionId,
        tokenType: 'access',
    }, env_1.env.JWT_SECRET, {
        expiresIn: `${env_1.env.ACCESS_TOKEN_TTL_MINUTES}m`,
    });
}
function signRefreshToken(userId, email, sessionId) {
    return jsonwebtoken_1.default.sign({
        sub: userId,
        email,
        sessionId,
        tokenType: 'refresh',
    }, env_1.env.JWT_SECRET, {
        expiresIn: `${env_1.env.REFRESH_TOKEN_TTL_DAYS}d`,
    });
}
function verifyAccessToken(token) {
    return verifyToken(token, 'access');
}
function verifyRefreshToken(token) {
    return verifyToken(token, 'refresh');
}
