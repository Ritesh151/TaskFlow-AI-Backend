"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const pino_http_1 = __importDefault(require("pino-http"));
const prisma_1 = require("./lib/prisma");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const errors_1 = require("./lib/errors");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const attendance_routes_1 = require("./routes/attendance.routes");
const auth_routes_1 = require("./routes/auth.routes");
const brain_routes_1 = require("./routes/brain.routes");
const intelligence_routes_1 = require("./routes/intelligence.routes");
const tasks_routes_1 = require("./routes/tasks.routes");
const app = (0, express_1.default)();
exports.app = app;
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    customLogLevel(_request, response, error) {
        if (error || response.statusCode >= 500) {
            return 'error';
        }
        if (response.statusCode >= 400) {
            return 'warn';
        }
        return 'info';
    },
    serializers: {
        req(request) {
            return {
                method: request.method,
                url: request.url,
            };
        },
        res(response) {
            return {
                statusCode: response.statusCode,
            };
        },
    },
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: {
        policy: 'cross-origin',
    },
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (env_1.env.FRONTEND_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new errors_1.AppError('Origin not allowed', 403, 'CORS_DENIED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, cookie_parser_1.default)(env_1.env.COOKIE_SECRET));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use((0, hpp_1.default)());
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again shortly.',
        code: 'RATE_LIMITED',
    },
}));
app.use('/api/auth', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again shortly.',
        code: 'AUTH_RATE_LIMITED',
    },
}));
app.get('/api/health', (_request, response) => (0, notFound_1.sendHealth)(response, 'ok'));
app.get('/api/live', (_request, response) => (0, notFound_1.sendHealth)(response, 'ok'));
app.get('/api/ready', async (_request, response, next) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        return (0, notFound_1.sendHealth)(response, 'ready');
    }
    catch (error) {
        return next(new errors_1.AppError('Database not ready', 503, 'DATABASE_NOT_READY'));
    }
});
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/tasks', tasks_routes_1.tasksRouter);
app.use('/api/intelligence', intelligence_routes_1.intelligenceRouter);
app.use('/api/attendance', attendance_routes_1.attendanceRouter);
app.use('/api/brain', brain_routes_1.brainRouter);
app.use('/api', notFound_1.apiNotFound);
app.use(errorHandler_1.errorHandler);
