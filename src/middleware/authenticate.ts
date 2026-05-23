import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { unauthorized } from '../lib/errors';
import { authLogger } from '../config/logger';
import type { PersistedSession } from '../types/persistence';
import { ACCESS_COOKIE_NAME } from '../utils/cookies';
import { verifyAccessToken, type TokenPayload } from '../utils/tokens';

export interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
  session?: PersistedSession;
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const accessToken = request.signedCookies?.[ACCESS_COOKIE_NAME] as string | undefined;
    if (!accessToken) {
      authLogger.warn('Auth middleware: no access token cookie found');
      throw unauthorized();
    }

    authLogger.info('Auth middleware: access token found, verifying');
    const payload = verifyAccessToken(accessToken);
    authLogger.info({ userId: payload.sub, sessionId: payload.sessionId }, 'Auth middleware: token verified');

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      authLogger.warn({ sessionId: payload.sessionId }, 'Auth middleware: session expired or revoked');
      throw unauthorized('Session expired');
    }

    authLogger.info({ sessionId: payload.sessionId }, 'Auth middleware: session valid, proceeding');

    const authRequest = request as AuthenticatedRequest;
    authRequest.auth = payload;
    authRequest.session = session;
    next();
  } catch (error) {
    next(error);
  }
}
