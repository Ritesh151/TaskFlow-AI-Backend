import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.IS_PRODUCTION ? 'info' : 'debug',
  base: {
    service: 'taskflow-backend',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
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

export const authLogger = logger.child({ scope: 'auth' });
