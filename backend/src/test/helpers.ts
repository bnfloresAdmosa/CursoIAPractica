import jwt from 'jsonwebtoken';

/**
 * Genera un Authorization header con un JWT válido (mismo secret que el server).
 * Para tests donde el endpoint requiere Bearer.
 */
export function makeAuthHeader(
  userId = 1,
  email = 'laura@empresa.com',
  roles: Record<string, 'ADMIN' | 'USER'> = { '1': 'ADMIN' },
): string {
  const token = jwt.sign({ sub: userId, email, roles }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

/**
 * Fixtures mínimos reutilizables. Cada test ajusta lo que necesita por mock.
 */
export const fixtureUser = {
  id: 1,
  name: 'Laura Méndez',
  email: 'laura@empresa.com',
  passwordHash: '$2a$10$0123456789012345678901uYY1234567890123456789012345678',
  createdAt: new Date('2026-04-01T09:00:00.000Z'),
};

export const fixtureProject = {
  id: 1,
  name: 'Rediseño Web',
  description: 'Desc demo',
  archivedAt: null as Date | null,
  createdBy: 1,
  createdAt: new Date('2026-04-01T09:00:00.000Z'),
};

export const fixturePriority = { id: 1, name: 'Alta', order: 1 };

export const fixtureTicket = {
  id: 1,
  title: 'Demo ticket',
  description: 'desc',
  status: 'Por hacer',
  priorityId: 1,
  projectId: 1,
  createdBy: 1,
  archivedAt: null as Date | null,
  createdAt: new Date('2026-04-14T10:00:00.000Z'),
  updatedAt: new Date('2026-04-14T10:00:00.000Z'),
  priority: fixturePriority,
  assignees: [] as Array<{ user: { id: number; name: string } }>,
  tags: [] as Array<{ tag: { id: number; name: string; color: string } }>,
  _count: { comments: 0 },
  lock: null as null | {
    expiresAt: Date;
    user: { id: number; name: string };
    lockedAt: Date;
  },
};
