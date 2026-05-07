---
name: Mini Jira — database schema v1 aprobado
description: `database-schema.yaml` (raíz del repo) es la especificación canónica del esquema SQL Server del backend Mini Jira. Aprobado el 2026-05-06.
type: project
---

`database-schema.yaml` es el contrato del schema. Aprobado el 2026-05-06.

**11 tablas en 6 categorías:**

| Categoría | Tablas |
|---|---|
| core | user, project, ticket, comment |
| catalog | priority (3 filas seed), tag (5 filas seed) |
| join | project_member, ticket_assignee, ticket_tag |
| audit | audit_log (INMUTABLE) |
| state | ticket_lock (TTL 15min, PK = ticket_id) |
| auth | refresh_token (rotación single-use) |

**Decisiones canónicas:**

- IDs: `INT IDENTITY(1,1)` en todos los PKs salvo `priority` (IDs hardcodeados 1=Alta, 2=Media, 3=Baja).
- Tablas N:M con PK compuesta (sin id sintético): `project_member`, `ticket_assignee`, `ticket_tag`.
- Timestamps: `DATETIME2(3)` UTC con default `SYSUTCDATETIME()`. NO `DATETIMEOFFSET`.
- Strings: `NVARCHAR(255)` standard, `NVARCHAR(MAX)` para `description` y `comment.body`.
- Soft delete universal: `archived_at` (project, ticket), `deleted_at` (comment). NUNCA DELETE físico salvo `refresh_token`.
- FKs: todas con `ON DELETE NO_ACTION`. Sin cascadas.
- `ticket.status` como `NVARCHAR(20)` con CHECK constraint `IN ('Por hacer', 'En progreso', 'Listo')`.
- `priority` requiere `[order]` con brackets en T-SQL (palabra reservada).
- `user.email` con collation explícita `Latin1_General_CI_AS` (defensa contra deploys con collation server case-sensitive).

**Reglas críticas de schema:**

- `audit_log` INMUTABLE — en prod: `DENY UPDATE, DELETE TO app_user`.
- `ticket.created_by` y `audit_log.actor_id` `NOT NULL` enforced en BD (EC-MVP-02 score 6 ALTO).
- `ticket_lock` con PK = `ticket_id` (un solo lock por ticket). TTL via env `LOCK_TIMEOUT_MINUTES` (default 15).
- Adquisición idempotente del lock vía `MERGE WITH (UPDLOCK, ROWLOCK)` (EC-MVP-01 score 9 CRÍTICO).
- `refresh_token` con rotación single-use: `consumed_at` por uso, `revoked_at` por reuso detectado (cadena vía `replaced_by_id`).

**Implementación:** `backend/prisma/schema.prisma` es la implementación operativa; el YAML es la spec. Cualquier divergencia es bug del schema.prisma. Migraciones con `pnpm prisma migrate dev`.

**Why:** El schema es la fuente de verdad para el backend; sin alineación canónica los handlers Express improvisan tipos y rompen invariantes (auditoría, locks, soft delete).

**How to apply:** Cuando llegue el momento de implementar `prisma/schema.prisma`, leer `database-schema.yaml` antes. Cualquier desviación necesaria (ej: tipos Prisma específicos como `BigInt` en lugar de Int, comportamiento de `@map`) requiere actualizar el YAML primero.
