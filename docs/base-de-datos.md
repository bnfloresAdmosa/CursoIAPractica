# Base de datos — Mini Jira

Documento generado por el Agente-BD a partir de [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) y [`database-schema.yaml`](../database-schema.yaml).

---

## Stack

- **Motor:** Microsoft SQL Server 2022 (override explícito de ADR-001 que originalmente eligió Supabase/PostgreSQL — ver `CLAUDE.md` §1).
- **ORM:** Prisma 6 con provider `sqlserver`. Migraciones gestionadas con `pnpm prisma migrate dev`. Schema canónico en `database-schema.yaml`; `schema.prisma` es la implementación operativa.

---

## ERD

12 entidades, agrupadas en 6 categorías. Cardinalidades modeladas con FK explícitas (todas `ON DELETE NO ACTION` — soft delete universal).

```mermaid
erDiagram
    user {
        int id PK
        nvarchar email UK
        nvarchar password_hash
        datetime2 created_at
    }

    project {
        int id PK
        nvarchar name
        int created_by FK
        datetime2 archived_at "NULL = activo"
        datetime2 created_at
    }

    project_member {
        int user_id PK_FK
        int project_id PK_FK
        nvarchar role "ADMIN | USER"
        datetime2 added_at
    }

    priority {
        int id PK "1=Alta 2=Media 3=Baja"
        nvarchar name UK
        smallint order UK
    }

    tag {
        int id PK
        nvarchar name UK
        varchar color "#RRGGBB"
    }

    ticket {
        int id PK
        nvarchar title
        nvarchar status "Por hacer|En progreso|Listo"
        int priority_id FK
        int project_id FK
        int created_by FK
        datetime2 archived_at "NULL = activo"
        datetime2 updated_at
    }

    ticket_assignee {
        int ticket_id PK_FK
        int user_id PK_FK
        datetime2 assigned_at
    }

    ticket_tag {
        int ticket_id PK_FK
        int tag_id PK_FK
    }

    comment {
        int id PK
        int ticket_id FK
        int user_id FK
        nvarchar body "LEN > 0"
        datetime2 deleted_at "NULL = activo"
        datetime2 created_at
    }

    audit_log {
        int id PK
        int ticket_id FK
        nvarchar field "status"
        nvarchar old_value
        nvarchar new_value
        int actor_id FK
        datetime2 timestamp
    }

    ticket_lock {
        int ticket_id PK_FK "un solo lock por ticket"
        int locked_by FK
        datetime2 locked_at
        datetime2 expires_at "TTL 15 min"
    }

    refresh_token {
        int id PK
        int user_id FK
        nvarchar token_hash UK "SHA-256"
        datetime2 expires_at
        datetime2 consumed_at "NULL = vivo"
        int replaced_by_id FK "cadena de rotación"
        datetime2 revoked_at
    }

    user ||--o{ project              : "crea"
    user ||--o{ project_member       : "es miembro de"
    project ||--o{ project_member    : "tiene"
    user ||--o{ ticket               : "crea"
    project ||--o{ ticket            : "contiene"
    priority ||--o{ ticket           : "clasifica"
    user ||--o{ ticket_assignee      : "es asignado en"
    ticket ||--o{ ticket_assignee    : "tiene asignados"
    ticket ||--o{ ticket_tag         : "tiene tags"
    tag ||--o{ ticket_tag            : "etiqueta"
    user ||--o{ comment              : "escribe"
    ticket ||--o{ comment            : "recibe"
    user ||--o{ audit_log            : "actúa"
    ticket ||--o{ audit_log          : "registra cambios"
    ticket ||--o| ticket_lock        : "puede estar bloqueado por"
    user ||--o{ ticket_lock          : "bloquea"
    user ||--o{ refresh_token        : "posee"
    refresh_token ||--o| refresh_token : "rotado por"
```

**Notas del diagrama:**

- `||--o|` en `ticket_lock` → cardinalidad 1:0..1 (un ticket tiene como máximo un lock activo).
- `refresh_token` se autorefenrencia vía `replaced_by_id`: cada token puede haber sido reemplazado por exactamente uno (cadena de rotación single-use).
- Las tres tablas N:M (`project_member`, `ticket_assignee`, `ticket_tag`) usan PK compuesta sin id sintético.

---

## Tabla de modelos

| Tabla | Categoría | Soft-delete | PK | FKs principales | Notas críticas |
|---|---|---|---|---|---|
| `user` | core | ❌ | `id` | — | Identidad por `email` (UNIQUE). `password_hash` con bcrypt cost ≥12; jamás se expone vía API. |
| `project` | core | ✅ `archived_at` | `id` | `created_by → user.id` | Soft-delete; nunca `DELETE` físico. Re-archivar es idempotente (actualiza `archived_at`). El creador queda como ADMIN automáticamente. |
| `project_member` | join | ❌ | `(user_id, project_id)` | `user_id → user.id`, `project_id → project.id` | Compuesta sin id sintético. `role` con CHECK `IN ('ADMIN','USER')`. Un mismo usuario puede ser ADMIN en un proyecto y USER en otro. |
| `priority` | catalog | ❌ | `id` (no IDENTITY) | — | Catálogo cerrado de 3 filas hardcodeadas (1=Alta, 2=Media, 3=Baja). Columna `order` requiere `[order]` en T-SQL (palabra reservada) — Prisma usa `@map`. |
| `tag` | catalog | ❌ | `id` | — | Catálogo **global** (no por proyecto). Cualquier ADMIN gestiona el CRUD. 5 filas seed. |
| `ticket` | core | ✅ `archived_at` | `id` | `priority_id`, `project_id`, `created_by → user.id` | `status` con CHECK `IN ('Por hacer','En progreso','Listo')`. Transiciones libres (sin máquina de estados). `created_by` `NOT NULL` enforced en BD (EC-MVP-02). Cambio de status genera fila en `audit_log` en la **misma transacción**. |
| `ticket_assignee` | join | ❌ | `(ticket_id, user_id)` | `ticket_id → ticket.id`, `user_id → user.id` | El asignado debe ser miembro del proyecto del ticket — validado en handler (no FK). INSERT dispara email fire-and-forget (HU-15). |
| `ticket_tag` | join | ❌ | `(ticket_id, tag_id)` | `ticket_id → ticket.id`, `tag_id → tag.id` | DELETE de un tag elimina sus filas aquí en transacción (cascada gestionada por la app). |
| `comment` | core | ✅ `deleted_at` | `id` | `ticket_id`, `user_id` | NO requiere lock del ticket (HU-10). Autor puede editar/eliminar; ADMIN del proyecto sólo puede eliminar ajenos. Menciones `@usuario` disparan email (HU-16). |
| `audit_log` | audit | ❌ | `id` | `ticket_id`, `actor_id → user.id` | **INMUTABLE** — sólo INSERT/SELECT desde la app. En prod: `DENY UPDATE, DELETE` al rol `app_user`. `actor_id` `NOT NULL` (EC-MVP-02). Fuente de verdad del dashboard de métricas. |
| `ticket_lock` | state | ❌ | `ticket_id` | `ticket_id → ticket.id`, `locked_by → user.id` | PK = `ticket_id` ⇒ máximo un lock por ticket. Adquisición vía `MERGE WITH (UPDLOCK, ROWLOCK)` idempotente — clave para EC-MVP-01 (score 9 CRÍTICO). TTL configurable vía `LOCK_TIMEOUT_MINUTES` (default 15). Lock vencido (`expires_at < SYSUTCDATETIME()`) se trata como inexistente. |
| `refresh_token` | auth | ❌ | `id` | `user_id`, `replaced_by_id → refresh_token.id` (autoref) | Rotación single-use: `consumed_at` se setea al usar; reuso del mismo hash → `revoked_at` en toda la cadena (recorre `replaced_by_id`). **Única tabla con DELETE físico permitido** (cleanup de tokens vencidos > 30d). El JWT crudo nunca se persiste; sólo SHA-256 en `token_hash`. |

---

## Reglas de negocio — enforcement

Mecanismo y capa donde cada invariante se hace cumplir.

| Regla | Mecanismo | Capa |
|---|---|---|
| `ticket.status ∈ {Por hacer, En progreso, Listo}` | `CHECK (status IN ('Por hacer','En progreso','Listo'))` (`ck_ticket_status`) | **BD** |
| `project_member.role ∈ {ADMIN, USER}` | `CHECK (role IN ('ADMIN','USER'))` (`ck_project_member_role`) | **BD** |
| `ticket.title` no vacío y ≤ 255 chars | `NVARCHAR(255) NOT NULL` (longitud) + Zod `min(1).max(255)` en `CreateTicketRequestSchema` | **BD + App (mixto)** |
| `comment.body` no vacío | `NVARCHAR(MAX) NOT NULL` + Zod `min(1)` en handler | **BD + App (mixto)** |
| `tag.color` formato `#RRGGBB` | `VARCHAR(7) NOT NULL` + validación Zod regex hex en handler | **App** (BD acepta `VARCHAR(7)` sin más) |
| `audit_log` inmutable | Sin endpoints `PATCH/DELETE` para `audit_log` (App) + `DENY UPDATE, DELETE TO app_user` en prod | **App + BD** |
| `audit_log.actor_id NOT NULL` (EC-MVP-02) | FK `NOT NULL` enforced en SQL Server | **BD** |
| `ticket.created_by NOT NULL` bajo concurrencia (EC-MVP-02) | `NOT NULL` enforced en BD; el handler extrae `userId` del JWT dentro del handler (no del request mutable por middleware async) | **BD + App** |
| `ticket_lock` único por ticket | `PRIMARY KEY (ticket_id)` | **BD** |
| Lock idempotente (mismo usuario re-adquiere) | `MERGE WITH (UPDLOCK, ROWLOCK)` con condición `locked_by = @userId OR expires_at < SYSUTCDATETIME()` en handler | **App + BD lock** |
| Cambio de status requiere lock vigente del actor | Validación en `PATCH /tickets/:id/status` (Phase B) | **App** |
| Audit log atómico con UPDATE de status | `prisma.$transaction` envolviendo `INSERT audit_log + UPDATE ticket` | **App** (transacción BD) |
| Refresh token single-use (rotación) | Flag `consumed_at` + `replaced_by_id` cadena; reuso → `revoked_at` recursivo | **App** |
| Refresh token expirado | `expires_at < NOW()` rechaza renovación; cleanup job `DELETE WHERE expires_at < NOW() - 30d` | **App** |
| `priority` IDs hardcodeados (1, 2, 3) | Seed insertado en migración inicial; `id` sin IDENTITY ⇒ inserts explícitos | **BD** (seed) |
| Catálogo `priority` cerrado | Sin endpoints públicos para crear/editar prioridades | **App** |
| Asignado debe ser miembro del proyecto (HU-09 borde) | Handler valida con `prisma.projectMember.findMany` antes de insertar `ticket_assignee` | **App** |
| Soft-delete universal (no `DELETE` físico) | Filtros default `WHERE archived_at IS NULL`; FKs `ON DELETE NO ACTION`; sin endpoints `DELETE` para entidades de negocio | **BD + App** |
| Solo Admin archiva tickets/proyectos | Middleware `ensureProjectMember(['ADMIN'])` en handler | **App** |
| Mensaje de login fallido genérico (HU-01 borde) | Handler retorna mismo `401 invalid_credentials` si email no existe o password incorrecta | **App** |
| Email único | `UNIQUE (email)` (`uq_user_email`) | **BD** |
| `tag.name` único | `UNIQUE (name)` (`uq_tag_name`) | **BD** |
| `priority.name` y `priority.order` únicos | `UNIQUE` (`uq_priority_name`, `uq_priority_order`) | **BD** |
| `refresh_token.token_hash` único | `UNIQUE (token_hash)` (`uq_refresh_hash`) | **BD** |

**Resumen de capas:**

- **BD pura** — invariantes de tipo, longitud, unicidad, CHECK enums, NOT NULL, FK NO ACTION.
- **App pura** — autorización por rol, transiciones complejas (rotación de tokens, idempotencia de lock con MERGE), reglas que dependen de contexto de request (asignado=miembro), notificaciones fire-and-forget.
- **Mixto** — `audit_log` inmutabilidad (app no muta + BD revoca permisos en prod), `created_by`/`actor_id` (BD enforce NOT NULL + app extrae del JWT), longitudes de texto (BD limita por tipo + Zod valida antes).

---

## Convenciones

| Convención | Detalle |
|---|---|
| **IDs** | `INT IDENTITY(1,1)` en todos los PKs salvo `priority` (IDs hardcodeados sin IDENTITY). Tablas N:M (`project_member`, `ticket_assignee`, `ticket_tag`) usan PK compuesta. INT (max ~2.1B) suficiente para el caso de uso. |
| **Timestamps** | `DATETIME2(3)` con `DEFAULT SYSUTCDATETIME()`. Siempre UTC en BD; el cliente convierte a local. Se eligió `DATETIME2` sobre `DATETIMEOFFSET` para evitar mezclar tipos cuando todo es UTC. |
| **Strings** | `NVARCHAR(N)` para soporte Unicode completo (acentos, ñ, emojis). `NVARCHAR(MAX)` para campos largos (`description`, `comment.body`). `VARCHAR(7)` sólo en `tag.color` (hex ASCII). |
| **Casing JSON ↔ BD** | API JSON en `camelCase` (`createdBy`, `archivedAt`, `priorityId`); BD en `snake_case` (`created_by`, `archived_at`, `priority_id`). Prisma `@map` resuelve la traducción en cada modelo. |
| **Collation** | Default del server (`Latin1_General_CI_AS` recomendado). `user.email` lleva collation explícita per-column para ser invariante a la collation default del server (defensa contra deploy sobre server case-sensitive). |
| **FK policy** | `ON DELETE NO ACTION` en todas las FKs. Cascadas violarían la política de soft-delete y auditabilidad. |
| **Identifiers reservados T-SQL** | `priority.order` requiere brackets `[order]` en T-SQL crudo. Prisma genera el quoting automáticamente. |
| **Migraciones** | `pnpm prisma migrate dev` en dev. Orden FK-safe documentado en `database-schema.yaml migrations_strategy.ordering` (user → priority → tag → project → project_member → ticket → joins → comment → audit_log → ticket_lock → refresh_token). |
