import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Mock prisma ANTES de cualquier import del app/router.
vi.mock('@/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    projectMember: { findMany: vi.fn() },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$mockedHash'),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import { prisma } from '@/db/prisma';
import { createApp } from '@/app';
import { fixtureUser, makeAuthHeader } from '@/test/helpers';

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/login', () => {
  it('Happy: credenciales válidas → 200 + tokens', async () => {
    // Given: usuario existe y la contraseña hashea correctamente
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fixtureUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { userId: 1, projectId: 1, role: 'ADMIN' } as never,
    ]);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);

    // When: POST /auth/login
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'laura@empresa.com', password: 'demo123' });

    // Then: 200 con accessToken, refreshToken, user y mapa de roles
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('laura@empresa.com');
    expect(res.body.roles).toEqual({ '1': 'ADMIN' });
  });

  it('Validation: email con formato inválido → 422 validation_error', async () => {
    // Given: body con email malformado
    // When: POST /auth/login con email inválido
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'no-es-email', password: 'demo123' });

    // Then: 422 con detalles del campo
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('Edge HU-01 borde: email no registrado → 401 invalid_credentials (mensaje genérico)', async () => {
    // Given: el email no existe en la BD
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // When: POST /auth/login
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'fantasma@empresa.com', password: 'cualquier' });

    // Then: 401 con código `invalid_credentials` — NO debe revelar que el email no existe
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_credentials');
    expect(res.body.error.message).toBe('Credenciales inválidas');
    // Sanity: el mismo error que cuando la pass está mal — sin distinguibles
  });
});

describe('POST /api/v1/auth/refresh', () => {
  const refreshTokenJwt = (() => {
    return require('jsonwebtoken').sign(
      { sub: 1, type: 'refresh', jti: 'test-jti' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );
  })();

  it('Happy: refresh válido y no consumido → 200 + tokens nuevos', async () => {
    // Given: el token está almacenado, no consumed_at, no revoked_at, no expirado
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 10,
      userId: 1,
      tokenHash: 'hash',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      consumedAt: null,
      replacedById: null,
      revokedAt: null,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fixtureUser);
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({ id: 11 } as never);
    vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);

    // When: POST /auth/refresh
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshTokenJwt });

    // Then: 200 + accessToken/refreshToken renovados
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
  });

  it('Validation: body sin refreshToken → 422', async () => {
    // Given: body vacío
    // When: POST /auth/refresh sin refreshToken
    const res = await request(app).post('/api/v1/auth/refresh').send({});

    // Then: 422 validation_error con detalles del campo
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details).toHaveProperty('refreshToken');
  });

  it('Edge: refresh token reusado (consumed_at != null) → 401 + revoca toda la cadena', async () => {
    // Given: el token ya tiene consumed_at marcado (reuso detectado)
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 10,
      userId: 1,
      tokenHash: 'hash',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      consumedAt: new Date(Date.now() - 60_000),
      replacedById: 11,
      revokedAt: null,
    } as never);
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 } as never);

    // When: POST /auth/refresh con el token reusado
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshTokenJwt });

    // Then: 401 refresh_expired + se llamó updateMany para revocar la cadena
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('refresh_expired');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 1, revokedAt: null }),
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('Happy: Bearer válido → 204 (sin body)', async () => {
    // Given: Bearer válido y prisma updateMany OK
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as never);

    // When: POST /auth/logout
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', makeAuthHeader());

    // Then: 204 sin body
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('Validation: sin Authorization header → 401 unauthorized', async () => {
    // Given: petición sin Bearer
    // When: POST /auth/logout
    const res = await request(app).post('/api/v1/auth/logout');

    // Then: 401 unauthorized
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('Edge: idempotente — sin tokens activos del user → 204 igualmente', async () => {
    // Given: el user no tiene tokens vigentes
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 } as never);

    // When: POST /auth/logout
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', makeAuthHeader());

    // Then: 204 (no fallar si ya estaban revocados)
    expect(res.status).toBe(204);
  });
});
