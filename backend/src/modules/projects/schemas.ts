import { registry, z } from '../../openapi/registry.js';

const ProjectRoleEnum = z.enum(['ADMIN', 'USER']);

export const ProjectSchema = registry.register(
  'Project',
  z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    archivedAt: z.string().datetime().nullable(),
    createdBy: z.number().int(),
    createdAt: z.string().datetime(),
    myRole: ProjectRoleEnum,
    memberCount: z.number().int(),
    openTicketCount: z.number().int(),
    lastActivityAt: z.string().datetime().nullable(),
  }),
);

export const ProjectListResponseSchema = registry.register(
  'ProjectListResponse',
  z.object({
    items: z.array(ProjectSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

export const CreateProjectRequestSchema = registry.register(
  'CreateProjectRequest',
  z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }),
);

export const UpdateProjectRequestSchema = registry.register(
  'UpdateProjectRequest',
  z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
  }),
);

export const ProjectArchivedSchema = registry.register(
  'ProjectArchived',
  z.object({
    id: z.number().int(),
    archivedAt: z.string().datetime(),
  }),
);

export const ListProjectsQuerySchema = z.object({
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
