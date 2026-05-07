import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { ensureProjectMember } from '../../lib/auth-helpers.js';
import { ApiError } from '../../middleware/errorHandler.js';

export type ProjectListItem = {
  id: number;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdBy: number;
  createdAt: string;
  myRole: 'ADMIN' | 'USER';
  memberCount: number;
  openTicketCount: number;
  lastActivityAt: string | null;
};

const PROJECT_INCLUDE = {
  _count: {
    select: {
      members: true,
      tickets: { where: { archivedAt: null } },
    },
  },
  tickets: {
    select: { updatedAt: true },
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
    where: { archivedAt: null },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithCounts = Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }> & {
  members: { role: string }[];
};

function toDTO(p: ProjectWithCounts): ProjectListItem {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdBy: p.createdBy,
    createdAt: p.createdAt.toISOString(),
    myRole: (p.members[0]?.role ?? 'USER') as 'ADMIN' | 'USER',
    memberCount: p._count.members,
    openTicketCount: p._count.tickets,
    lastActivityAt: p.tickets[0]?.updatedAt.toISOString() ?? null,
  };
}

export async function listProjects(
  userId: number,
  filters: { archived?: boolean; q?: string; cursor?: string; limit: number },
): Promise<{ items: ProjectListItem[]; nextCursor: string | null; hasMore: boolean }> {
  const archived = filters.archived ?? false;

  const where: Prisma.ProjectWhereInput = {
    members: { some: { userId } },
    archivedAt: archived ? { not: null } : null,
    ...(filters.q ? { name: { contains: filters.q } } : {}),
    ...(filters.cursor ? { id: { gt: decodeCursor(filters.cursor) } } : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    take: filters.limit + 1,
    orderBy: { id: 'asc' },
    include: {
      ...PROJECT_INCLUDE,
      members: { where: { userId }, select: { role: true } },
    },
  });

  const hasMore = projects.length > filters.limit;
  const slice = hasMore ? projects.slice(0, filters.limit) : projects;
  const items = slice.map((p) => toDTO(p as ProjectWithCounts));
  const last = slice[slice.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.id) : null;

  return { items, nextCursor, hasMore };
}

export async function getProject(userId: number, projectId: number): Promise<ProjectListItem> {
  await ensureProjectMember(userId, projectId);
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      ...PROJECT_INCLUDE,
      members: { where: { userId }, select: { role: true } },
    },
  });
  if (!p) throw new ApiError(404, 'Proyecto no encontrado', 'not_found');
  return toDTO(p as ProjectWithCounts);
}

export async function createProject(
  userId: number,
  data: { name: string; description?: string },
): Promise<ProjectListItem> {
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: userId,
      },
    });
    await tx.projectMember.create({
      data: { userId, projectId: created.id, role: 'ADMIN' },
    });
    return created;
  });

  return getProject(userId, project.id);
}

export async function updateProject(
  userId: number,
  projectId: number,
  data: { name?: string; description?: string | null },
): Promise<ProjectListItem> {
  await ensureProjectMember(userId, projectId, ['ADMIN']);
  await prisma.project.update({ where: { id: projectId }, data });
  return getProject(userId, projectId);
}

export async function archiveProject(
  userId: number,
  projectId: number,
): Promise<{ id: number; archivedAt: string }> {
  await ensureProjectMember(userId, projectId, ['ADMIN']);
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });
  return { id: updated.id, archivedAt: updated.archivedAt!.toISOString() };
}

function encodeCursor(id: number): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

function decodeCursor(cursor: string): number {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { id?: unknown };
    if (typeof parsed.id !== 'number') throw new Error('bad cursor');
    return parsed.id;
  } catch {
    throw new ApiError(400, 'Cursor inválido', 'bad_request');
  }
}
