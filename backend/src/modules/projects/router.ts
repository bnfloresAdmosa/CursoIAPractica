import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getAuthedUser } from '../../lib/auth-helpers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { registry } from '../../openapi/registry.js';
import { ApiErrorSchema } from '../auth/schemas.js';
import {
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
  ProjectArchivedSchema,
  ProjectListResponseSchema,
  ProjectSchema,
  UpdateProjectRequestSchema,
} from './schemas.js';
import {
  archiveProject,
  createProject,
  getProject,
  listProjects,
  updateProject,
} from './service.js';

export const projectsRouter = Router();
projectsRouter.use(authenticate);

// ── GET /projects ─────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/projects',
  tags: ['projects'],
  summary: 'Lista proyectos del usuario (paginación cursor)',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      archived: z.enum(['true', 'false']).optional(),
      q: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: ProjectListResponseSchema } } },
    401: { description: 'No auth', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const filters = ListProjectsQuerySchema.parse(req.query);
    const result = await listProjects(user.id, filters);
    res.status(200).json(result);
  }),
);

// ── GET /projects/:projectId ──────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/projects/{projectId}',
  tags: ['projects'],
  summary: 'Detalle del proyecto',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ projectId: z.coerce.number().int() }) },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: ProjectSchema } } },
    403: { description: 'No miembro', content: { 'application/json': { schema: ApiErrorSchema } } },
    404: { description: 'No existe', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectsRouter.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const projectId = Number(req.params.projectId);
    if (!projectId) throw new ApiError(400, 'projectId inválido', 'bad_request');
    const project = await getProject(user.id, projectId);
    res.status(200).json(project);
  }),
);

// ── POST /projects ────────────────────────────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/projects',
  tags: ['projects'],
  summary: 'Crear proyecto (creador queda como Admin)',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: CreateProjectRequestSchema } } } },
  responses: {
    201: { description: 'Creado', content: { 'application/json': { schema: ProjectSchema } } },
    422: { description: 'Validación', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const body = CreateProjectRequestSchema.parse(req.body);
    const project = await createProject(user.id, body);
    res.status(201).json(project);
  }),
);

// ── PATCH /projects/:projectId ────────────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/projects/{projectId}',
  tags: ['projects'],
  summary: 'Editar proyecto (Admin del proyecto)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ projectId: z.coerce.number().int() }),
    body: { content: { 'application/json': { schema: UpdateProjectRequestSchema } } },
  },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: ProjectSchema } } },
    403: { description: 'No Admin', content: { 'application/json': { schema: ApiErrorSchema } } },
    422: { description: 'Validación', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectsRouter.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const projectId = Number(req.params.projectId);
    if (!projectId) throw new ApiError(400, 'projectId inválido', 'bad_request');
    const body = UpdateProjectRequestSchema.parse(req.body);
    const project = await updateProject(user.id, projectId, body);
    res.status(200).json(project);
  }),
);

// ── PATCH /projects/:projectId/archive ────────────────────────────────────
registry.registerPath({
  method: 'patch',
  path: '/projects/{projectId}/archive',
  tags: ['projects'],
  summary: 'Archivar proyecto (soft delete idempotente)',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ projectId: z.coerce.number().int() }) },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: ProjectArchivedSchema } } },
    403: { description: 'No Admin', content: { 'application/json': { schema: ApiErrorSchema } } },
  },
});

projectsRouter.patch(
  '/:projectId/archive',
  asyncHandler(async (req, res) => {
    const user = getAuthedUser(req);
    const projectId = Number(req.params.projectId);
    if (!projectId) throw new ApiError(400, 'projectId inválido', 'bad_request');
    const result = await archiveProject(user.id, projectId);
    res.status(200).json(result);
  }),
);
