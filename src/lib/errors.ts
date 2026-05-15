export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    details?: unknown,
    expose = statusCode < 500,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(message, 400, 'BAD_REQUEST', details);
}

export function unauthorized(message = 'Authentication required') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden') {
  return new AppError(message, 403, 'FORBIDDEN');
}

export function notFound(message = 'Resource not found') {
  return new AppError(message, 404, 'NOT_FOUND');
}
