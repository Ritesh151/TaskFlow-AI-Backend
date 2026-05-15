import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { unauthorized } from '../lib/errors';
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
      throw unauthorized();
    }

    const payload = verifyAccessToken(accessToken);
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw unauthorized('Session expired');
    }

    const authRequest = request as AuthenticatedRequest;
    authRequest.auth = payload;
    authRequest.session = session;
    next();
  } catch (error) {
    next(error);
  }
}
