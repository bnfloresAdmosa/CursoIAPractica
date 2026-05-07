import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { env } from './env.js';

// bcryptjs en lugar de bcrypt nativo — pnpm 10 bloquea postinstall scripts
// y bcrypt requiere compilar binding nativo. bcryptjs es pure JS, mismo API,
// ~3x más lento pero suficiente para herramienta interna.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomTokenId(): string {
  return randomBytes(16).toString('hex');
}
