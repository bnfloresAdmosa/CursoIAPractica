import type { Request } from 'express';
import { prisma } from '../db/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';

export type ProjectRole = 'ADMIN' | 'USER';

type AuthedUser = {
  id: number;
  email: string;
  roles: Record<string, ProjectRole>;
};

export function getAuthedUser(req: Request): AuthedUser {
  if (!req.user) {
    throw new ApiError(401, 'Auth requerido', 'unauthorized');
  }
  return req.user;
}

export async function ensureProjectMember(
  userId: number,
  projectId: number,
  allowedRoles: ProjectRole[] = ['ADMIN', 'USER'],
): Promise<{ role: ProjectRole }> {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!member) {
    throw new ApiError(403, 'No eres miembro de este proyecto', 'forbidden_member');
  }
  const role = member.role as ProjectRole;
  if (!allowedRoles.includes(role)) {
    throw new ApiError(403, 'Rol insuficiente', 'forbidden_role');
  }
  return { role };
}

export async function ensureTicketAccess(
  userId: number,
  ticketId: number,
  options: { adminOnly?: boolean; allowAssignee?: boolean } = {},
): Promise<{
  ticket: { id: number; projectId: number; status: string };
  role: ProjectRole;
  isAssignee: boolean;
}> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      projectId: true,
      status: true,
      assignees: { where: { userId }, select: { userId: true } },
    },
  });
  if (!ticket) throw new ApiError(404, 'Ticket no encontrado', 'not_found');

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId: ticket.projectId } },
  });
  if (!member) {
    throw new ApiError(403, 'No eres miembro del proyecto', 'forbidden_member');
  }

  const role = member.role as ProjectRole;
  const isAssignee = ticket.assignees.length > 0;

  if (options.adminOnly && role !== 'ADMIN') {
    throw new ApiError(403, 'Solo Admin del proyecto', 'forbidden_role');
  }

  if (options.allowAssignee && role !== 'ADMIN' && !isAssignee) {
    throw new ApiError(403, 'Solo Admin o asignado al ticket', 'forbidden_role');
  }

  return {
    ticket: { id: ticket.id, projectId: ticket.projectId, status: ticket.status },
    role,
    isAssignee,
  };
}
