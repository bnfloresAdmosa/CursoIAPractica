import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { ensureProjectMember, ensureTicketAccess } from '../../lib/auth-helpers.js';
import { ApiError } from '../../middleware/errorHandler.js';

export type TicketDTO = {
  id: number;
  title: string;
  description: string | null;
  status: 'Por hacer' | 'En progreso' | 'Listo';
  priority: { id: number; name: string; order: number };
  projectId: number;
  createdBy: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string; color: string }>;
  commentCount: number;
  lock: {
    lockedBy: { id: number; name: string };
    lockedAt: string;
    expiresAt: string;
  } | null;
};

const TICKET_INCLUDE = {
  priority: true,
  assignees: { include: { user: { select: { id: true, name: true } } } },
  tags: { include: { tag: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
  lock: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.TicketInclude;

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof TICKET_INCLUDE }>;

function toDTO(t: TicketWithRelations): TicketDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TicketDTO['status'],
    priority: { id: t.priority.id, name: t.priority.name, order: t.priority.order },
    projectId: t.projectId,
    createdBy: t.createdBy,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignees: t.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
    tags: t.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name, color: tt.tag.color })),
    commentCount: t._count.comments,
    lock:
      t.lock && t.lock.expiresAt > new Date()
        ? {
            lockedBy: { id: t.lock.user.id, name: t.lock.user.name },
            lockedAt: t.lock.lockedAt.toISOString(),
            expiresAt: t.lock.expiresAt.toISOString(),
          }
        : null,
  };
}

export async function listTickets(
  userId: number,
  projectId: number,
  filters: {
    status: string[];
    priority: string[];
    tag: number[];
    assignee: number[];
    q?: string;
    archived: boolean;
    cursor?: string;
    limit: number;
  },
): Promise<{ items: TicketDTO[]; nextCursor: string | null; hasMore: boolean }> {
  await ensureProjectMember(userId, projectId);

  const where: Prisma.TicketWhereInput = {
    projectId,
    archivedAt: filters.archived ? { not: null } : null,
    ...(filters.status.length > 0 ? { status: { in: filters.status } } : {}),
    ...(filters.priority.length > 0
      ? { priority: { name: { in: filters.priority } } }
      : {}),
    ...(filters.tag.length > 0 ? { tags: { some: { tagId: { in: filters.tag } } } } : {}),
    ...(filters.assignee.length > 0
      ? { assignees: { some: { userId: { in: filters.assignee } } } }
      : {}),
    ...(filters.q ? { title: { contains: filters.q } } : {}),
    ...(filters.cursor ? { id: { gt: decodeCursor(filters.cursor) } } : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    include: TICKET_INCLUDE,
    take: filters.limit + 1,
    orderBy: { id: 'asc' },
  });

  const hasMore = tickets.length > filters.limit;
  const slice = hasMore ? tickets.slice(0, filters.limit) : tickets;
  const items = slice.map(toDTO);
  const last = slice[slice.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.id) : null;

  return { items, nextCursor, hasMore };
}

export async function getTicket(userId: number, ticketId: number): Promise<TicketDTO> {
  await ensureTicketAccess(userId, ticketId);
  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: TICKET_INCLUDE,
  });
  if (!t) throw new ApiError(404, 'Ticket no encontrado', 'not_found');
  return toDTO(t);
}

export async function createTicket(
  userId: number,
  projectId: number,
  data: {
    title: string;
    description?: string;
    priorityId: number;
    status?: 'Por hacer' | 'En progreso' | 'Listo';
    assigneeIds?: number[];
    tagIds?: number[];
  },
): Promise<TicketDTO> {
  await ensureProjectMember(userId, projectId);

  // Validar que cada assignee es miembro del proyecto (HU-09 borde).
  if (data.assigneeIds && data.assigneeIds.length > 0) {
    const uniqueIds = [...new Set(data.assigneeIds)];
    const members = await prisma.projectMember.findMany({
      where: { projectId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    if (members.length !== uniqueIds.length) {
      throw new ApiError(
        422,
        'Algún asignado no es miembro del proyecto',
        'validation_error',
        { assigneeIds: 'Todos los asignados deben ser miembros del proyecto' },
      );
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status ?? 'Por hacer',
      priorityId: data.priorityId,
      projectId,
      createdBy: userId,
      ...(data.assigneeIds && data.assigneeIds.length > 0
        ? {
            assignees: {
              create: [...new Set(data.assigneeIds)].map((uid) => ({ userId: uid })),
            },
          }
        : {}),
      ...(data.tagIds && data.tagIds.length > 0
        ? {
            tags: {
              create: [...new Set(data.tagIds)].map((tid) => ({ tagId: tid })),
            },
          }
        : {}),
    },
    include: TICKET_INCLUDE,
  });

  return toDTO(ticket);
}

export async function archiveTicket(
  userId: number,
  ticketId: number,
): Promise<{ id: number; archivedAt: string }> {
  await ensureTicketAccess(userId, ticketId, { adminOnly: true });
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { archivedAt: new Date() },
  });
  return { id: updated.id, archivedAt: updated.archivedAt!.toISOString() };
}

// PATCH /tickets/:id/status
// Phase B agregará: requerir lock activo del usuario antes de permitir el cambio.
// Por ahora: auth + role (Admin o asignado) + UPDATE+INSERT audit_log en transacción.
export async function changeTicketStatus(
  userId: number,
  ticketId: number,
  newStatus: 'Por hacer' | 'En progreso' | 'Listo',
): Promise<TicketDTO> {
  const { ticket } = await ensureTicketAccess(userId, ticketId, { allowAssignee: true });

  // Idempotente: si ya está en ese status, no genera audit log ni UPDATE.
  if (ticket.status === newStatus) {
    const t = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });
    if (!t) throw new ApiError(404, 'Ticket no encontrado', 'not_found');
    return toDTO(t);
  }

  // Transacción: INSERT audit_log + UPDATE ticket. Si el log falla, el UPDATE se revierte.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        ticketId,
        field: 'status',
        oldValue: ticket.status,
        newValue: newStatus,
        actorId: userId,
      },
    });
    return tx.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus },
      include: TICKET_INCLUDE,
    });
  });

  return toDTO(updated);
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
