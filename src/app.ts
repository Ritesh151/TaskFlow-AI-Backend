import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { prisma } from './lib/prisma';
import { env } from './config/env';
import { logger } from './config/logger';
import { AppError } from './lib/errors';
import { errorHandler } from './middleware/errorHandler';
import { apiNotFound, sendHealth } from './middleware/notFound';
import { attendanceRouter } from './routes/attendance.routes';
import { authRouter } from './routes/auth.routes';
import { brainRouter } from './routes/brain.routes';
import { intelligenceRouter } from './routes/intelligence.routes';
import { tasksRouter } from './routes/tasks.routes';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger,
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
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  }),
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.FRONTEND_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError('Origin not allowed', 403, 'CORS_DENIED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(hpp());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again shortly.',
      code: 'RATE_LIMITED',
    },
  }),
);

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again shortly.',
      code: 'AUTH_RATE_LIMITED',
    },
  }),
);

app.get('/api/health', (_request, response) => sendHealth(response, 'ok'));
app.get('/api/live', (_request, response) => sendHealth(response, 'ok'));
app.get('/api/ready', async (_request, response, next) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return sendHealth(response, 'ready');
  } catch (error) {
    return next(new AppError('Database not ready', 503, 'DATABASE_NOT_READY'));
  }
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/brain', brainRouter);

app.use('/api', apiNotFound);
app.use(errorHandler);

export { app };
