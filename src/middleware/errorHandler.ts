import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError, isAppError } from '../lib/errors';

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error(
        {
          err: error,
          method: request.method,
          url: request.originalUrl,
        },
        'Application error',
      );
    }

    response.status(error.statusCode).json({
      success: false,
      message: error.expose ? error.message : 'Internal server error',
      code: error.code,
      details: error.expose ? error.details : undefined,
    });
    return;
  }

  if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
    response.status(409).json({
      success: false,
      message: 'A record with the same unique value already exists.',
      code: 'CONFLICT',
    });
    return;
  }

  const normalizedError =
    error instanceof Error ? error : new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');

  logger.error(
    {
      err: normalizedError,
      method: request.method,
      url: request.originalUrl,
    },
    'Unhandled request error',
  );

  response.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
}
