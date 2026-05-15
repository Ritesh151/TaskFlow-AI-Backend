import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authLogger } from '../config/logger';
import { env } from '../config/env';
import { badRequest, notFound, unauthorized } from '../lib/errors';
import type { ApiUser, AuthSessionPayload } from '../types/domain';
import type { PersistedSession, PersistedUser } from '../types/persistence';
import { sha256 } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../utils/tokens';

type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

function accessExpiresAt() {
  return new Date(Date.now() + env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000);
}

function refreshExpiresAt() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function serializeUser(user: PersistedUser): ApiUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function buildSessionPayload(
  user: PersistedUser,
  accessExpiry: Date,
  session: PersistedSession,
): AuthSessionPayload {
  return {
    user: serializeUser(user),
    accessTokenExpiresAt: accessExpiry.toISOString(),
    refreshTokenExpiresAt: session.expiresAt.toISOString(),
  };
}

async function issueSession(user: PersistedUser, context: SessionContext, existingSessionId?: string) {
  const accessExpiry = accessExpiresAt();
  const refreshExpiry = refreshExpiresAt();
  const sessionId = existingSessionId ?? randomUUID();

  const refreshToken = signRefreshToken(user.id, user.email, sessionId);
  const accessToken = signAccessToken(user.id, user.email, sessionId);

  const sessionData = {
    userId: user.id,
    refreshTokenHash: sha256(refreshToken),
    expiresAt: refreshExpiry,
    revokedAt: null,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  };

  const session = existingSessionId
    ? await prisma.session.update({
        where: { id: sessionId },
        data: sessionData,
      })
    : await prisma.session.create({
        data: {
          id: sessionId,
          ...sessionData,
        },
      });

  return {
    accessToken,
    refreshToken,
    payload: buildSessionPayload(user, accessExpiry, session),
  };
}

export async function ensureSeedUser() {
  const existing = await prisma.user.findUnique({
    where: { email: env.SEED_USER_EMAIL.toLowerCase() },
  });

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(env.SEED_USER_PASSWORD, env.BCRYPT_SALT_ROUNDS);
  return prisma.user.create({
    data: {
      email: env.SEED_USER_EMAIL.toLowerCase(),
      name: env.SEED_USER_NAME,
      passwordHash,
      role: 'owner',
    },
  });
}

export async function loginUser(email: string, password: string, context: SessionContext) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    authLogger.warn({ email }, 'Login failed: user not found');
    throw unauthorized('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    authLogger.warn({ email }, 'Login failed: password mismatch');
    throw unauthorized('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  authLogger.info({ userId: user.id, email: user.email }, 'Login succeeded');
  return issueSession(user, context);
}

export async function refreshUserSession(refreshToken: string, context: SessionContext) {
  const payload = verifyRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh session expired');
  }

  if (session.refreshTokenHash !== sha256(refreshToken)) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Refresh session invalidated');
  }

  authLogger.info({ userId: session.user.id, sessionId: session.id }, 'Refreshing session');
  return issueSession(session.user, context, session.id);
}

export async function logoutUser(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.session.updateMany({
      where: {
        id: payload.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    authLogger.info({ sessionId: payload.sessionId, userId: payload.sub }, 'Session logged out');
  } catch {
    authLogger.warn('Logout called with invalid refresh token');
  }
}

export async function getCurrentSession(userId: string, auth: TokenPayload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw notFound('User not found');
  }

  const session = await prisma.session.findUnique({
    where: { id: auth.sessionId },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Session expired');
  }

  const accessExpiry = auth.exp ? new Date(auth.exp * 1000) : accessExpiresAt();
  return buildSessionPayload(user, accessExpiry, session);
}
