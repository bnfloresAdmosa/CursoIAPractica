import { registry, z } from '../../openapi/registry.js';

export const ApiErrorSchema = registry.register(
  'ApiError',
  z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
);

export const LoginRequestSchema = registry.register(
  'LoginRequest',
  z.object({
    email: z.string().email().openapi({ example: 'ana@empresa.com' }),
    password: z.string().min(1).openapi({ example: 'password123' }),
  }),
);

export const UserSummarySchema = registry.register(
  'UserSummary',
  z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().email(),
  }),
);

export const LoginResponseSchema = registry.register(
  'LoginResponse',
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int(),
    user: UserSummarySchema,
    roles: z.record(z.string(), z.enum(['ADMIN', 'USER'])),
  }),
);

export const RefreshRequestSchema = registry.register(
  'RefreshRequest',
  z.object({ refreshToken: z.string() }),
);

export const RefreshResponseSchema = registry.register(
  'RefreshResponse',
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int(),
  }),
);
