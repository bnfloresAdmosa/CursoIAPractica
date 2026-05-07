import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getAuthedUser } from '../../lib/auth-helpers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { registry } from '../../openapi/registry.js';
import { ApiErrorSchema } from '../auth/schemas.js';
import {
  ChangeStatusRequestSchema,
  CreateTicketRequestSchema,
  ListTicketsQuerySchema,
  TicketArchivedSchema,
  TicketListResponseSchema,
  TicketSchema,
} from './schemas.js';
import {
  archiveTicket,
  changeTicketStatus,
  createTicket,
  getTicket,
  listTickets,
} from './service.js';

// Router montado en /api/v1/projects/:projectId/tickets
export const projectTicketsRouter = Router({ mergeParams: true });
projectTicketsRouter.use(authenticate);

// Router montado en /api/v1/tickets
export const ticketsRouter = Router();
ticketsRouter.use(authenticate);

// ── GET /projects/:projectId/tickets ──────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/projects/{projectId}/tickets',
  tags: ['tickets'],
  summary: 'Listar tickets del proyecto (paginación + filtros AND)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ projectId: z.coerce.number().int() }),
    query: z.object({
      status: z.string().optional().openapi({ description: 'Comma-list: "Por hacer,En progreso,Listo"' }),
      priority: z.string().optional().openapi({ description: 'Comma-list de nombres: "Alta,Media,Baja"' }),
      tag: z.string().optional().openapi({ description: 'Comma-list de tag ids: "1,2"' }),
      assignee: z.string().optional().openapi({ description: 'Comma-list de user ids: "4"' }),
      q: z.string().optional(),
      archived: z.enum(['true', 'false']).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: TicketListResponseSchema } } },
    403: { description: 'No miembro', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectTicketsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const projectId = Number(req.params.projectId);
    if (!projectId) throw new ApiError(400, 'projectId inválido', 'bad_request');
    const filters = ListTicketsQuerySchema.parse(req.query);
    const result = await listTickets(user.id, projectId, filters);
    res.status(200).json(result);
  }),
);

// ── POST /projects/:projectId/tickets ─────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/projects/{projectId}/tickets',
  tags: ['tickets'],
  summary: 'Crear ticket en el proyecto (cualquier miembro)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ projectId: z.coerce.number().int() }),
    body: { content: { 'application/json': { schema: CreateTicketRequestSchema } } },
  },
  responses: {
    201: { description: 'Creado', content: { 'application/json': { schema: TicketSchema } } },
    403: { description: 'No miembro', content: { 'application/json': { schema: ApiErrorSchema } } },
    422: { description: 'Validación', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectTicketsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const projectId = Number(req.params.projectId);
    if (!projectId) throw new ApiError(400, 'projectId inválido', 'bad_request');
    const body = CreateTicketRequestSchema.parse(req.body);
    const ticket = await createTicket(user.id, projectId, body);
    res.status(201).json(ticket);
  }),
);

// ── GET /tickets/:ticketId ────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/tickets/{ticketId}',
  tags: ['tickets'],
  summary: 'Detalle de ticket',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ ticketId: z.coerce.number().int() }) },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: TicketSchema } } },
    403: { description: 'No miembro', content: { 'application/json': { schema: ApiErrorSchema } } },
    404: { description: 'No existe', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

ticketsRouter.get(
  '/:ticketId',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const ticketId = Number(req.params.ticketId);
    if (!ticketId) throw new ApiError(400, 'ticketId inválido', 'bad_request');
    const ticket = await getTicket(user.id, ticketId);
    res.status(200).json(ticket);
  }),
);

// ── PATCH /tickets/:ticketId/status ───────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/tickets/{ticketId}/status',
  tags: ['tickets'],
  summary: 'Cambiar status del ticket (Admin o asignado; genera audit log; lock en Phase B)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ ticketId: z.coerce.number().int() }),
    body: { content: { 'application/json': { schema: ChangeStatusRequestSchema } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: TicketSchema } } },
    403: { description: 'Sin acceso', content: { 'application/json': { schema: ApiErrorSchema } } },
    404: { description: 'No existe', content: { 'application/json': { schema: ApiErrorSchema } } },
    422: { description: 'Validación', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

ticketsRouter.patch(
  '/:ticketId/status',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const ticketId = Number(req.params.ticketId);
    if (!ticketId) throw new ApiError(400, 'ticketId inválido', 'bad_request');
    const body = ChangeStatusRequestSchema.parse(req.body);
    const ticket = await changeTicketStatus(user.id, ticketId, body.status);
    res.status(200).json(ticket);
  }),
);

// ── PATCH /tickets/:ticketId/archive ──────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/tickets/{ticketId}/archive',
  tags: ['tickets'],
  summary: 'Archivar ticket (soft delete, Admin del proyecto, idempotente)',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ ticketId: z.coerce.number().int() }) },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: TicketArchivedSchema } } },
    403: { description: 'No Admin', content: { 'application/json': { schema: ApiErrorSchema } } },
    404: { description: 'No existe', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

ticketsRouter.patch(
  '/:ticketId/archive',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const ticketId = Number(req.params.ticketId);
    if (!ticketId) throw new ApiError(400, 'ticketId inválido', 'bad_request');
    const result = await archiveTicket(user.id, ticketId);
    res.status(200).json(result);
  }),
);
