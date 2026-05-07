import { prisma } from '../../db/prisma.js';
import { env } from '../../lib/env.js';
import { hashPassword, randomTokenId, sha256, verifyPassword } from '../../lib/hash.js';
import {
  parseExpiresIn,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { ApiError } from '../../middleware/errorHandler.js';

type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; name: string; email: string };
  roles: Record<string, 'ADMIN' | 'USER'>;
};

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // mensaje genérico (HU-01 borde) — no revela si el email existe
    throw new ApiError(401, 'Credenciales inválidas', 'invalid_credentials');
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'Credenciales inválidas', 'invalid_credentials');
  }
  return issueTokens(user.id, user.email, user.name);
}

export async function refresh(refreshTokenJwt: string): Promise<AuthResult> {
  try {
    verifyRefreshToken(refreshTokenJwt);
  } catch {
    throw new ApiError(401, 'Refresh token expirado o inválido', 'refresh_expired');
  }

  const tokenHash = sha256(refreshTokenJwt);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt) {
    throw new ApiError(401, 'Refresh token expirado o inválido', 'refresh_expired');
  }
  if (stored.consumedAt) {
    // ¡reuso detectado! revocar todos los refresh tokens del usuario.
    // Conservador: revoca toda la cadena del usuario, no solo los descendientes.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, 'Refresh token reusado — cadena revocada', 'refresh_expired');
  }
  if (stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token expirado', 'refresh_expired');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw new ApiError(401, 'Refresh token expirado o inválido', 'refresh_expired');
  }

  const next = await issueTokens(user.id, user.email, user.name);
  const nextHash = sha256(next.refreshToken);
  const nextStored = await prisma.refreshToken.findUnique({ where: { tokenHash: nextHash } });

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: {
      consumedAt: new Date(),
      replacedById: nextStored?.id ?? null,
    },
  });

  return next;
}

export async function logout(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null, consumedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function issueTokens(
  userId: number,
  email: string,
  name: string,
): Promise<AuthResult> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });
  const roles = Object.fromEntries(
    memberships.map((m) => [String(m.projectId), m.role as 'ADMIN' | 'USER']),
  );

  const accessToken = signAccessToken({ sub: userId, email, roles });
  const jti = randomTokenId();
  const refreshToken = signRefreshToken(userId, jti);
  const tokenHash = sha256(refreshToken);

  const refreshTtlSeconds = parseExpiresIn(env.JWT_REFRESH_TTL);
  const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const accessTtlSeconds = parseExpiresIn(env.JWT_ACCESS_TTL);

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTtlSeconds,
    user: { id: userId, name, email },
    roles,
  };
}

// Helper para tests/seed: registra un usuario. NO es endpoint público.
export async function registerUser(email: string, name: string, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({ data: { email, name, passwordHash } });
}
