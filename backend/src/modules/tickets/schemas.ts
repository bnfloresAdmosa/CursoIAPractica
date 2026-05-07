import { registry, z } from '../../openapi/registry.js';

const TicketStatusSchema = z.enum(['Por hacer', 'En progreso', 'Listo']);

export const PrioritySchema = registry.register(
  'Priority',
  z.object({
    id: z.number().int(),
    name: z.string(),
    order: z.number().int(),
  }),
);

export const AssigneeSummarySchema = registry.register(
  'AssigneeSummary',
  z.object({ id: z.number().int(), name: z.string() }),
);

export const TagSummarySchema = registry.register(
  'TagSummary',
  z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
  }),
);

export const LockSummarySchema = registry.register(
  'LockSummary',
  z.object({
    lockedBy: z.object({ id: z.number().int(), name: z.string() }),
    lockedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
);

export const TicketSchema = registry.register(
  'Ticket',
  z.object({
    id: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    status: TicketStatusSchema,
    priority: PrioritySchema,
    projectId: z.number().int(),
    createdBy: z.number().int(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    assignees: z.array(AssigneeSummarySchema),
    tags: z.array(TagSummarySchema),
    commentCount: z.number().int(),
    lock: LockSummarySchema.nullable(),
  }),
);

export const TicketListResponseSchema = registry.register(
  'TicketListResponse',
  z.object({
    items: z.array(TicketSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

export const CreateTicketRequestSchema = registry.register(
  'CreateTicketRequest',
  z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    priorityId: z.number().int(),
    status: TicketStatusSchema.optional(),
    assigneeIds: z.array(z.number().int()).optional(),
    tagIds: z.array(z.number().int()).optional(),
  }),
);

export const TicketArchivedSchema = registry.register(
  'TicketArchived',
  z.object({
    id: z.number().int(),
    archivedAt: z.string().datetime(),
  }),
);

export const ChangeStatusRequestSchema = registry.register(
  'ChangeStatusRequest',
  z.object({
    status: TicketStatusSchema,
  }),
);

export const ListTicketsQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
  priority: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : [])),
  tag: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n))
        : [],
    ),
  assignee: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n))
        : [],
    ),
  q: z.string().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
