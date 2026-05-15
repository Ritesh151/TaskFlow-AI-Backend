import type { Request, Response } from 'express';
import { sendSuccess } from '../lib/response';

export function apiNotFound(request: Request, response: Response) {
  return response.status(404).json({
    success: false,
    message: `Cannot ${request.method} ${request.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

export function healthPayload(status: 'ok' | 'ready') {
  return {
    status,
    timestamp: new Date().toISOString(),
  };
}

export function sendHealth(response: Response, status: 'ok' | 'ready') {
  return sendSuccess(response, healthPayload(status));
}
