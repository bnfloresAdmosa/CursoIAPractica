import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from './env.js';

export type AccessTokenPayload = {
  sub: number;
  email: string;
  roles: Record<string, 'ADMIN' | 'USER'>;
};

type RefreshTokenPayload = {
  sub: number;
  type: 'refresh';
  jti: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
}

export function signRefreshToken(userId: number, jti: string): string {
  const opts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'refresh', jti }, env.JWT_REFRESH_SECRET, opts);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as RefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return payload;
}

// Convierte '1h' / '7d' / '15m' / '30s' a segundos.
export function parseExpiresIn(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) throw new Error(`Invalid TTL: ${ttl}`);
  const n = parseInt(m[1]!, 10);
  const unit = m[2]!;
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * map[unit]!;
}
