import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('@/db/prisma', () => {
  const mock = {
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => Promise<unknown>) =>
    cb(mock),
  );
  return { prisma: mock };
});

import { prisma } from '@/db/prisma';
import { createApp } from '@/app';
import { fixtureTicket, makeAuthHeader } from '@/test/helpers';

const app = createApp();
const ADMIN_BEARER = makeAuthHeader(1, 'laura@empresa.com', { '1': 'ADMIN' });
const USER_BEARER = makeAuthHeader(2, 'carlos@empresa.com', { '1': 'USER' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/projects/:projectId/tickets', () => {
  it('Happy: miembro lista tickets con assignees + tags', async () => {
    // Given: user es miembro y el proyecto tiene 1 ticket con asignados
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([
      {
        ...fixtureTicket,
        assignees: [{ user: { id: 1, name: 'Laura' } }],
        tags: [{ tag: { id: 1, name: 'bug', color: '#d92d20' } }],
      },
    ] as never);

    // When: GET /projects/1/tickets
    const res = await request(app)
      .get('/api/v1/projects/1/tickets')
      .set('Authorization', ADMIN_BEARER);

    // Then: 200 con items poblados
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].assignees).toEqual([{ id: 1, name: 'Laura' }]);
    expect(res.body.items[0].tags[0].name).toBe('bug');
    expect(res.body.hasMore).toBe(false);
  });

  it('Validation: limit fuera de rango → 422', async () => {
    // Given/When: limit > 100
    const res = await request(app)
      .get('/api/v1/projects/1/tickets?limit=9999')
      .set('Authorization', ADMIN_BEARER);

    // Then: 422
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('Edge: no-miembro intenta listar → 403', async () => {
    // Given: ensureProjectMember falla (no membership)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);

    // When: GET tickets de un proyecto al que no pertenece
    const res = await request(app)
      .get('/api/v1/projects/1/tickets')
      .set('Authorization', ADMIN_BEARER);

    // Then: 403 forbidden_member (sin filtrar info del proyecto)
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden_member');
  });
});

describe('POST /api/v1/projects/:projectId/tickets', () => {
  it('Happy: miembro crea ticket con prioridad → 201', async () => {
    // Given: user es miembro
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'USER',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.ticket.create).mockResolvedValue({
      ...fixtureTicket,
      id: 50,
    } as never);

    // When: POST /projects/1/tickets
    const res = await request(app)
      .post('/api/v1/projects/1/tickets')
      .set('Authorization', ADMIN_BEARER)
      .send({ title: 'Nuevo bug', priorityId: 1 });

    // Then: 201 + ticket persistido
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(50);
    expect(prisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Nuevo bug', createdBy: 1 }),
      }),
    );
  });

  it('Validation HU-05 borde: title de 256 chars → 422', async () => {
    // Given: ensureProjectMember pasa
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'USER',
      addedAt: new Date(),
    } as never);

    // When: POST con title 256 chars
    const tooLong = 'a'.repeat(256);
    const res = await request(app)
      .post('/api/v1/projects/1/tickets')
      .set('Authorization', ADMIN_BEARER)
      .send({ title: tooLong, priorityId: 1 });

    // Then: 422
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details).toHaveProperty('title');
  });

  it('Edge HU-09 borde: assignee no es miembro del proyecto → 422 con details', async () => {
    // Given: user es miembro, pero el assignee 99 no
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'USER',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([]); // ningún member encontrado

    // When: POST con assigneeIds que no están en el proyecto
    const res = await request(app)
      .post('/api/v1/projects/1/tickets')
      .set('Authorization', ADMIN_BEARER)
      .send({ title: 'Test', priorityId: 1, assigneeIds: [99] });

    // Then: 422 validation_error con details
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details).toHaveProperty('assigneeIds');
  });
});

describe('GET /api/v1/tickets/:ticketId', () => {
  it('Happy: miembro consulta ticket → 200 con detalles completos', async () => {
    // Given: ticket existe y user pertenece al proyecto
    vi.mocked(prisma.ticket.findUnique)
      .mockResolvedValueOnce({
        id: 1,
        projectId: 1,
        status: 'Por hacer',
        assignees: [{ userId: 1 }],
      } as never)
      .mockResolvedValueOnce(fixtureTicket as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);

    // When: GET /tickets/1
    const res = await request(app).get('/api/v1/tickets/1').set('Authorization', ADMIN_BEARER);

    // Then: 200
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('Validation: id no numérico → 400 bad_request', async () => {
    // Given/When: path param string
    const res = await request(app).get('/api/v1/tickets/xyz').set('Authorization', ADMIN_BEARER);

    // Then: 400
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('Edge: ticket existe pero user no es miembro del proyecto → 403', async () => {
    // Given: ticket existe pero membership de user es null
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'Por hacer',
      assignees: [],
    } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);

    // When: GET /tickets/1
    const res = await request(app).get('/api/v1/tickets/1').set('Authorization', ADMIN_BEARER);

    // Then: 403 forbidden_member
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden_member');
  });
});

describe('PATCH /api/v1/tickets/:ticketId/status', () => {
  it('Happy HU-07: Admin cambia status → 200 + audit_log INSERT en transacción', async () => {
    // Given: ticket existe en "Por hacer", user es ADMIN
    vi.mocked(prisma.ticket.findUnique)
      .mockResolvedValueOnce({
        id: 1,
        projectId: 1,
        status: 'Por hacer',
        assignees: [],
      } as never)
      // segunda llamada en updated.findUnique no aplica (transacción usa update)
      ;
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...fixtureTicket,
      status: 'En progreso',
    } as never);

    // When: PATCH /tickets/1/status con "En progreso"
    const res = await request(app)
      .patch('/api/v1/tickets/1/status')
      .set('Authorization', ADMIN_BEARER)
      .send({ status: 'En progreso' });

    // Then: 200 + audit_log fue insertado en la misma transacción
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('En progreso');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          field: 'status',
          oldValue: 'Por hacer',
          newValue: 'En progreso',
          actorId: 1,
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('Validation HU-07 borde: status fuera del catálogo → 422', async () => {
    // Given: user accede al ticket
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'Por hacer',
      assignees: [],
    } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);

    // When: PATCH con status inválido
    const res = await request(app)
      .patch('/api/v1/tickets/1/status')
      .set('Authorization', ADMIN_BEARER)
      .send({ status: 'Cancelado' });

    // Then: 422 — Zod enum rechaza el valor
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    // Sanity: no se llamó a audit ni transaction
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('Edge: idempotente — mismo status que el actual → 200 sin INSERT en audit_log', async () => {
    // Given: ticket ya está en "En progreso"
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'En progreso',
      assignees: [],
    } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    // segunda findUnique para retornar DTO
    vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
      id: 1,
      projectId: 1,
      status: 'En progreso',
      assignees: [],
    } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(fixtureTicket as never);

    // When: PATCH al mismo status
    const res = await request(app)
      .patch('/api/v1/tickets/1/status')
      .set('Authorization', ADMIN_BEARER)
      .send({ status: 'En progreso' });

    // Then: 200, NO se generó audit_log ni se hizo update
    expect(res.status).toBe(200);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/tickets/:ticketId/archive', () => {
  it('Happy HU-08: Admin archiva ticket → 200 con archivedAt', async () => {
    // Given: user es ADMIN del proyecto
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'Por hacer',
      assignees: [],
    } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 1,
      projectId: 1,
      role: 'ADMIN',
      addedAt: new Date(),
    } as never);
    const archivedAt = new Date();
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...fixtureTicket,
      archivedAt,
    } as never);

    // When: PATCH /tickets/1/archive
    const res = await request(app)
      .patch('/api/v1/tickets/1/archive')
      .set('Authorization', ADMIN_BEARER);

    // Then: 200 con id + archivedAt
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, archivedAt: archivedAt.toISOString() });
  });

  it('Validation: id inválido → 400', async () => {
    // Given/When: id no numérico
    const res = await request(app)
      .patch('/api/v1/tickets/abc/archive')
      .set('Authorization', ADMIN_BEARER);

    // Then: 400
    expect(res.status).toBe(400);
  });

  it('Edge HU-08 borde: USER intenta archivar → 403 forbidden_role', async () => {
    // Given: user es USER (no ADMIN)
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 1,
      projectId: 1,
      status: 'Por hacer',
      assignees: [],
    } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      userId: 2,
      projectId: 1,
      role: 'USER',
      addedAt: new Date(),
    } as never);

    // When: PATCH como USER
    const res = await request(app)
      .patch('/api/v1/tickets/1/archive')
      .set('Authorization', USER_BEARER);

    // Then: 403 forbidden_role
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden_role');
    // Sanity: no se llamó a update
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
