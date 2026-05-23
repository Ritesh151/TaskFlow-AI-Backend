import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../lib/response';
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from '../utils/cookies';
import { getCurrentSession, loginUser, logoutUser, refreshUserSession } from '../services/auth.service';
import { loginSchema } from '../validators/auth.validator';
import { authLogger } from '../config/logger';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (request, response) => {
    authLogger.info({ email: request.body.email }, 'POST /api/auth/login');

    const result = await loginUser(request.body.email, request.body.password, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });

    setAuthCookies(response, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    authLogger.info('Login response: cookies set, returning payload');
    return sendSuccess(response, result.payload);
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (request, response) => {
    authLogger.info('POST /api/auth/refresh');

    const refreshToken = request.signedCookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await refreshUserSession(refreshToken ?? '', {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    });

    setAuthCookies(response, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    authLogger.info('Refresh response: new tokens set');
    return sendSuccess(response, result.payload);
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (request, response) => {
    authLogger.info('POST /api/auth/logout');

    const refreshToken = request.signedCookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await logoutUser(refreshToken);
    clearAuthCookies(response);

    authLogger.info('Logout complete: cookies cleared');
    return sendSuccess(response, { loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    authLogger.info('GET /api/auth/me');

    const authRequest = request as AuthenticatedRequest;
    const session = await getCurrentSession(authRequest.auth?.sub ?? '', authRequest.auth!);

    authLogger.info('GET /api/auth/me: returning session');
    return sendSuccess(response, session);
  }),
);
