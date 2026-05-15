"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("./env");
exports.logger = (0, pino_1.default)({
    level: env_1.env.IS_PRODUCTION ? 'info' : 'debug',
    base: {
        service: 'taskflow-backend',
        env: env_1.env.NODE_ENV,
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'res.headers["set-cookie"]',
        ],
        censor: '[Redacted]',
    },
});
exports.authLogger = exports.logger.child({ scope: 'auth' });
