import type { Response } from 'express';
import { env } from '../config/env';

export const ACCESS_COOKIE_NAME = 'tf_access';
export const REFRESH_COOKIE_NAME = 'tf_refresh';

type AuthCookiePayload = {
  accessToken: string;
  refreshToken: string;
};

const baseCookie = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: 'strict' as const,
  signed: true,
  path: '/',
};

export function setAuthCookies(response: Response, payload: AuthCookiePayload) {
  response.cookie(ACCESS_COOKIE_NAME, payload.accessToken, {
    ...baseCookie,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });

  response.cookie(REFRESH_COOKIE_NAME, payload.refreshToken, {
    ...baseCookie,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(ACCESS_COOKIE_NAME, baseCookie);
  response.clearCookie(REFRESH_COOKIE_NAME, baseCookie);
}
