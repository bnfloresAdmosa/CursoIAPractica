import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getAuthedUser } from '../../lib/auth-helpers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { registry } from '../../openapi/registry.js';
import { login, logout, refresh } from './service.js';
import {
  ApiErrorSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
} from './schemas.js';

export const authRouter = Router();

// ── POST /auth/login ──────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  summary: 'Login con email + password',
  request: { body: { content: { 'application/json': { schema: LoginRequestSchema } } } },
  responses: {
    200: { description: 'Tokens emitidos', content: { 'application/json': { schema: LoginResponseSchema } } },
    401: { description: 'Credenciales inválidas (mensaje genérico)', content: { 'application/json': { schema: ApiErrorSchema } } },
    422: { description: 'Validación', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = LoginRequestSchema.parse(req.body);
    const result = await login(body.email, body.password);
    res.status(200).json(result);
  }),
);

// ── POST /auth/refresh ────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['auth'],
  summary: 'Rotar refresh token (single-use)',
  request: { body: { content: { 'application/json': { schema: RefreshRequestSchema } } } },
  responses: {
    200: { description: 'Tokens rotados', content: { 'application/json': { schema: RefreshResponseSchema } } },
    401: { description: 'Refresh expirado/revocado/reusado', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = RefreshRequestSchema.parse(req.body);
    const result = await refresh(body.refreshToken);
    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  }),
);

// ── POST /auth/logout ─────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['auth'],
  summary: 'Logout — revoca refresh tokens activos del usuario',
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: 'OK (sin body)' },
    401: { description: 'No autenticado', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    await logout(user.id);
    res.status(204).send();
  }),
);
