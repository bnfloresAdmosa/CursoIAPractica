import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('@/db/prisma', () => {
  const mock = {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // $transaction(callback): pasa el mismo prisma como tx
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => Promise<unknown>) =>
    cb(mock),
  );
  return { prisma: mock };
});

import { prisma } from '@/db/prisma';
import { createApp } from '@/app';
import { fixtureProject, makeAuthHeader } from '@/test/helpers';

const app = createApp();
const ADMIN_BEARER = makeAuthHeader(1, 'laura@empresa.com', { '1': 'ADMIN' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/projects', () => {
  it('Happy: lista proyectos del usuario con aggregates', async () => {
    // Given: 1 proyecto donde el user es ADMIN
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        ...fixtureProject,
        members: [{ role: 'ADMIN' }],
        _count: { members: 6, tickets: 28 },
        tickets: [{ updatedAt: new Date('2026-04-19T16:20:00.000Z') }],
      } as never,
    ]);

    // When: GET /projects con Bearer válido
    const res = await request(app).get('/api/v1/projects').set('Authorization', ADMIN_BEARER);

    // Then: 200 + items con myRole, memberCount, openTicketCount
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: 1,
      name: 'Rediseño Web',
      myRole: 'ADMIN',
      memberCount: 6,
      openTicketCount: 28,
    });
    expect(res.body.hasMore).toBe(false);
  });

  it('Validation: limit > 100 → 422', async () => {
    // Given/When: query con limit fuera de rango
    const res = await request(app)
      .get('/api/v1/projects?limit=999')
      .set('Authorization', ADMIN_BEARER);

    // Then: 422 validation_error
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('Edge: usuario sin memberships → items vacíos', async () => {
    // Given: prisma devuelve [] porque el WHERE members.some({userId}) no matchea
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    // When: GET /projects
    const res = await request(app).get('/api/v1/projects').set('Authorization', ADMIN_BEARER);

    // Then: 200 con items vacío
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.hasMore).toBe(false);
  });
});

describe('GET /api/v1/projects/:projectId', () => {
  it('Happy: miembro consulta proyecto → 200', async () => {
    // Given: el user es miembro y el proyecto existe
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...fixtureProject,
      members: [{ role: 'ADMIN' }],
      _count: { members: 6, tickets: 28 },
      tickets: [],
    } as never);

    // When: GET /projects/1
    const res = await request(app).get('/api/v1/projects/1').set('Authorization', ADMIN_BEARER);

    // Then: 200
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.myRole).toBe('ADMIN');
  });

  it('Validation: id no numérico → 400 bad_request', async () => {
    // Given/When: path param con string
    const res = await request(app).get('/api/v1/projects/abc').set('Authorization', ADMIN_BEARER);

    // Then: 400 bad_request (Number(abc) === NaN → falsy en handler)
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('Edge HU-02 borde: usuario no es miembro → 403 forbidden_member', async () => {
    // Given: ensureProjectMember no encuentra membership
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);

    // When: GET /projects/1
    const res = await request(app).get('/api/v1/projects/1').set('Authorization', ADMIN_BEARER);

    // Then: 403 forbidden_member (no debe filtrar info del proyecto)
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden_member');
  });
});

describe('POST /api/v1/projects', () => {
  it('Happy: crea proyecto + creador queda como ADMIN (transacción)', async () => {
    // Given: prisma create + projectMember.create + getProject final
    vi.mocked(prisma.project.create).mockResolvedValue({ ...fixtureProject, id: 7 } as never);
    vi.mocked(prisma.projectMember.create).mockResolvedValue({} as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 7,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...fixtureProject,
      id: 7,
      members: [{ role: 'ADMIN' }],
      _count: { members: 1, tickets: 0 },
      tickets: [],
    } as never);

    // When: POST /projects
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', ADMIN_BEARER)
      .send({ name: 'Nuevo Proyecto', description: 'desc' });

    // Then: 201 + creador es Admin
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(7);
    expect(res.body.myRole).toBe('ADMIN');
    expect(prisma.projectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 1, role: 'ADMIN' }),
      }),
    );
  });

  it('Validation: name vacío → 422', async () => {
    // Given/When: body con name vacío
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', ADMIN_BEARER)
      .send({ name: '' });

    // Then: 422 con detalles
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details).toHaveProperty('name');
  });

  it('Edge HU-03 borde: nombre duplicado se permite (no únicos globalmente)', async () => {
    // Given: ya existe otro proyecto con el mismo nombre — la API no valida unicidad
    vi.mocked(prisma.project.create).mockResolvedValue({ ...fixtureProject, id: 8 } as never);
    vi.mocked(prisma.projectMember.create).mockResolvedValue({} as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 8,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...fixtureProject,
      id: 8,
      members: [{ role: 'ADMIN' }],
      _count: { members: 1, tickets: 0 },
      tickets: [],
    } as never);

    // When: POST con un nombre que "ya existe"
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', ADMIN_BEARER)
      .send({ name: 'Rediseño Web' });

    // Then: 201 (otro id) — los nombres no son únicos globalmente
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(8);
  });
});

describe('PATCH /api/v1/projects/:projectId', () => {
  it('Happy: Admin actualiza nombre → 200', async () => {
    // Given: user es ADMIN del proyecto
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...fixtureProject,
      name: 'Nuevo nombre',
    } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...fixtureProject,
      name: 'Nuevo nombre',
      members: [{ role: 'ADMIN' }],
      _count: { members: 6, tickets: 28 },
      tickets: [],
    } as never);

    // When: PATCH /projects/1
    const res = await request(app)
      .patch('/api/v1/projects/1')
      .set('Authorization', ADMIN_BEARER)
      .send({ name: 'Nuevo nombre' });

    // Then: 200
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nuevo nombre');
  });

  it('Validation: name de 256+ chars → 422', async () => {
    // Given/When: name supera 255 chars
    const tooLong = 'a'.repeat(256);
    const res = await request(app)
      .patch('/api/v1/projects/1')
      .set('Authorization', ADMIN_BEARER)
      .send({ name: tooLong });

    // Then: 422
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('Edge HU-04 borde: Usuario (no Admin) intenta editar → 403', async () => {
    // Given: user es USER (no ADMIN) en el proyecto
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'USER',
      addedAt: new Date(),
    } as never);

    // When: PATCH como USER
    const res = await request(app)
      .patch('/api/v1/projects/1')
      .set('Authorization', makeAuthHeader(1, 'laura@empresa.com', { '1': 'USER' }))
      .send({ name: 'no permitido' });

    // Then: 403 forbidden_role
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden_role');
  });
});

describe('PATCH /api/v1/projects/:projectId/archive', () => {
  it('Happy: Admin archiva → 200 + archivedAt timestamp', async () => {
    // Given: user es ADMIN
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    const archivedAt = new Date('2026-05-06T10:00:00.000Z');
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...fixtureProject,
      archivedAt,
    } as never);

    // When: PATCH /projects/1/archive
    const res = await request(app)
      .patch('/api/v1/projects/1/archive')
      .set('Authorization', ADMIN_BEARER);

    // Then: 200 con archivedAt
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, archivedAt: archivedAt.toISOString() });
  });

  it('Validation: id inválido → 400', async () => {
    // Given/When: id no numérico
    const res = await request(app)
      .patch('/api/v1/projects/abc/archive')
      .set('Authorization', ADMIN_BEARER);

    // Then: 400
    expect(res.status).toBe(400);
  });

  it('Edge HU-04 borde: re-archivar es idempotente → 200 con timestamp nuevo', async () => {
    // Given: proyecto ya archivado, Admin re-archiva
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    const newArchivedAt = new Date();
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...fixtureProject,
      archivedAt: newArchivedAt,
    } as never);

    // When: PATCH /archive sobre ya archivado
    const res = await request(app)
      .patch('/api/v1/projects/1/archive')
      .set('Authorization', ADMIN_BEARER);

    // Then: 200 (no error) y se actualizó el timestamp
    expect(res.status).toBe(200);
    expect(prisma.project.update).toHaveBeenCalled();
  });
});
