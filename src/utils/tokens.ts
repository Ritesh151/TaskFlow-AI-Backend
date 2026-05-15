import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from '../lib/errors';

export interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  tokenType: 'access' | 'refresh';
}

function verifyToken(token: string, expectedType: TokenPayload['tokenType']) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    if (decoded.tokenType !== expectedType) {
      throw unauthorized('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      throw unauthorized(error.message === 'jwt expired' ? 'Session expired' : 'Invalid session token');
    }
    throw unauthorized('Invalid session token');
  }
}

export function signAccessToken(userId: string, email: string, sessionId: string) {
  return jwt.sign(
    {
      sub: userId,
      email,
      sessionId,
      tokenType: 'access',
    },
    env.JWT_SECRET,
    {
      expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    },
  );
}

export function signRefreshToken(userId: string, email: string, sessionId: string) {
  return jwt.sign(
    {
      sub: userId,
      email,
      sessionId,
      tokenType: 'refresh',
    },
    env.JWT_SECRET,
    {
      expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    },
  );
}

export function verifyAccessToken(token: string) {
  return verifyToken(token, 'access');
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, 'refresh');
}
