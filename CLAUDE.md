# Mini Jira — Guía para agentes

Herramienta interna de tickets, MVP de 3 semanas, ~10 usuarios. Antes de hacer cambios no triviales, lee:

**Producto y reglas de negocio**
- @Specs-MiniJira/specs.md — PRD canónico v1.0.
- @Specs-MiniJira/full-backlog.md — 16 historias en Gherkin con bordes; **fuente de verdad para criterios de aceptación**.
- @Specs-MiniJira/compact-backlog.md — versión P0/P1/P2 para priorizar.

**Diseño y datos**
- @Base-Specs/architecture.md — diagrama C4 y decisiones de diseño.
- @Base-Specs/er.md — entidades, FK y cardinalidades.
- @Base-Specs/secuencia.md — flujo "mover ticket a Listo" con lock + audit + release.
- @database-schema.yaml — esquema canónico aprobado (raíz del repo).
- @api-contract.md — contrato REST canónico.

**UX**
- @Prototype/styles.css — design tokens canónicos (paleta Apple).
- @Prototype/screens/ — 7 pantallas de referencia visual: Login, Projects, Board, TicketDetail, CreateTicket, Dashboard, Archived.

**QA**
- @Base-Specs/TestPlan.md — 21 TCs + EC-MVP-01 (CRÍTICO score 9: idempotencia de lock) y EC-MVP-02 (ALTO: `created_by` no nulo bajo concurrencia).

Cuando los documentos discrepan: **PRD/full-backlog** mandan en reglas de negocio, **prototipo** manda en estética, **ER + database-schema.yaml** mandan en esquema de BD.

---

## 1. Stack

| Capa | Decisión |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router DOM v7 |
| Estado servidor | TanStack Query v5 |
| Estado UI | Zustand |
| Drag & Drop | @dnd-kit/core |
| Estilos | CSS plano con design tokens (variables CSS) — sin Tailwind ni shadcn |
| Backend | Node 20 + TypeScript + Express |
| ORM | Prisma 6 (provider `sqlserver`) |
| Validación | Zod (con `@asteasolutions/zod-to-openapi` para generar OpenAPI) |
| Auth | JWT access + refresh, bcryptjs (cost ≥ 12) |
| **BD** | **Microsoft SQL Server 2022** |
| Logging | pino + pino-http |
| Seguridad HTTP | helmet + cors |
| Docs API | swagger-ui-express en `/api/v1/docs` |
| Tests | Vitest (unit + integración con supertest) |

---

## 2. Estructura del repo

Estructura plana, sin workspaces (no introducir `packages/`, Turborepo, ni pnpm workspaces).

```
repo/
├── frontend/             # React + Vite
├── backend/              # Express + Prisma
├── Base-Specs/           # PRD, ADR, ER, secuencia, mock.sql, TestPlan
├── Specs-MiniJira/       # PRD + backlog completo + compact backlog
├── Prototype/            # HTML + JSX de referencia (no se construye)
├── docs/                 # Documentación mkdocs (api-reference, base-de-datos, etc.)
├── scripts/              # setup-dev.sh, seed.sh, cleanup.sh
├── docker-compose.yml    # SQL Server 2022 fallback greenfield
├── api-contract.md       # contrato REST canónico
├── database-schema.yaml  # esquema BD canónico
├── mkdocs.yml
├── .env.example
└── CLAUDE.md
```

### 2.1 Frontend — `frontend/src/`

```
src/
├── features/
│   ├── auth/         # LoginScreen, RequireAuth, useAuth
│   ├── board/        # BoardScreen, BoardFilters, hooks
│   ├── projects/     # ProjectsScreen, NewProjectCard
│   ├── tickets/      # (pendiente)
│   ├── comments/     # (pendiente)
│   └── dashboard/    # (pendiente)
├── components/
│   ├── ui/           # Avatar, Badge, Btn, StatusChip, PriorityChip, TicketCard, etc.
│   ├── layout/       # AppLayout, SideBar, TopBar
│   └── board/        # KanbanBoard, KanbanColumn
├── lib/              # api, queryClient, types, mock-data
├── routes/           # rutas declaradas en App.tsx
├── store/            # zustand stores (projectsStore)
├── styles.css        # design tokens + clases del prototipo
├── App.tsx
└── main.tsx
```

Reglas:
- Cada `features/<dominio>/` es autónomo: importa desde `components/ui`, `lib/`, otros features **solo** vía hooks/api públicos.
- Las llamadas a API se centralizan en `lib/api.ts` y se consumen vía TanStack Query. No `useEffect + fetch` sueltos.
- Nada de barrels (`index.ts` reexportando todo). Importar rutas explícitas.

### 2.2 Backend — `backend/src/`

```
src/
├── modules/
│   ├── auth/        { router.ts, service.ts, schemas.ts, auth.test.ts }
│   ├── projects/    { router.ts, service.ts, schemas.ts, projects.test.ts }
│   └── tickets/     { router.ts, service.ts, schemas.ts, tickets.test.ts }
├── middleware/      # authenticate, errorHandler
├── db/              # prisma client singleton
├── lib/             # jwt, hash, env (zod-validated), logger, asyncHandler, auth-helpers
├── openapi/         # registry + document generator (zod-to-openapi)
├── test/            # helpers + setup para Vitest
├── types/
├── app.ts           # express app factory
└── server.ts        # http listen
```

`prisma/schema.prisma` vive en `backend/prisma/`. **Nunca** escribir SQL directo: todo pasa por Prisma o `prisma.$queryRaw`. Migraciones generadas con `prisma migrate dev`, jamás editadas a mano.

### 2.3 Sincronización de tipos FE↔BE

Sin `packages/shared`. Los **schemas Zod son la fuente de verdad** y viven en `backend/src/modules/<x>/schemas.ts`. El frontend mantiene sus propios tipos en `frontend/src/lib/types.ts`. Cualquier cambio de schema requiere actualizar ambos lados en el mismo PR.

---

## 3. Estilos

Tokens canónicos en `frontend/src/styles.css` (portados de `Prototype/styles.css`). Las clases CSS del prototipo (`.btn`, `.chip`, `.card`, `.input`, `.avatar`, etc.) se usan directamente en los componentes; los componentes UI en `components/ui/` encapsulan estas clases en componentes React reutilizables.

Reglas no negociables:
- No introducir colores fuera del catálogo de tokens. Si el diseño pide uno nuevo, se agrega como variable CSS en `:root`.
- Modo oscuro: **fuera de scope MVP** (PRD §3). No agregar `dark:` selectors hasta v1.1.
- Responsive: desktop primero, mobile funcional.

---

## 4. Convenciones de componentes (frontend)

- **Nombre de archivo**: PascalCase para componentes (`TicketCard.tsx`), camelCase para hooks (`useTicketLock.ts`) y módulos (`api.ts`).
- **Un componente por archivo**, salvo subcomponentes privados < 30 líneas.
- **Props**: `type` (no `interface`), sufijo `Props`. Sin `React.FC`.
- **Server state vía TanStack Query**: `useTicketsQuery`, `useUpdateTicketMutation`. Las keys viven junto al hook como constantes.
- **Optimistic updates**: solo para acciones reversibles (cambio de estado, asignación). Locks y archivado son **siempre** servidor primero.
- **Locks pesimistas**: hook `useTicketLock(ticketId)` — adquiere al montar el editor, libera en unmount/save/cancel, **refresca cada 30s**. Banner compartido `<LockBanner>`.
- **Auditoría**: el frontend **nunca** escribe en `AuditLog` directo. El backend lo hace en la misma transacción que el cambio.

---

## 5. Convenciones de backend

### 5.1 Endpoints REST

Versionados bajo `/api/v1/...`. Contrato canónico en `api-contract.md`.

| Método | Path | Quién | Notas |
|---|---|---|---|
| `POST` | `/auth/login` | público | retorna `{access, refresh}` |
| `POST` | `/auth/refresh` | público | rota refresh |
| `GET` | `/projects` | autenticado | filtros: `?archived=true` |
| `POST` | `/projects` | autenticado | creador queda como Admin |
| `PATCH` | `/projects/:id` | Admin del proyecto | nombre, descripción |
| `PATCH` | `/projects/:id/archive` | Admin del proyecto | soft delete |
| `GET` | `/projects/:id/tickets` | miembro del proyecto | filtros §2.6 PRD |
| `POST` | `/projects/:id/tickets` | miembro del proyecto | cualquier miembro crea |
| `PATCH` | `/tickets/:id` | Admin o asignado | edita campos editables |
| `PATCH` | `/tickets/:id/status` | Admin o asignado | **requiere lock activo del usuario** |
| `PATCH` | `/tickets/:id/archive` | Admin del proyecto | soft delete |
| `PATCH` | `/tickets/:id/assignees` | Admin del proyecto | array de userIds |
| `GET` | `/tickets/:id/lock` | autenticado | consulta estado |
| `POST` | `/tickets/:id/lock` | Admin o asignado | **idempotente** (ver §5.4) |
| `DELETE` | `/tickets/:id/lock` | dueño del lock | libera tu propio lock; `?force=true` **NO está en MVP** |
| `POST` | `/tickets/:id/comments` | Admin o asignado | no requiere lock |
| `PATCH` | `/comments/:id` | autor del comentario | |
| `DELETE` | `/comments/:id` | autor o Admin del proyecto | soft delete (`deleted_at`) |
| `GET` | `/projects/:id/dashboard` | miembro del proyecto | métricas calculadas desde `AuditLog` |

Convención: BD/SQL en snake_case, API JSON en camelCase. Prisma maneja la conversión vía `@map`.

### 5.2 Validación y errores

- Cada handler valida `req.body`/`req.params`/`req.query` con `safeParse` antes de tocar el service. Nunca confiar en TypeScript runtime.
- Códigos: `401` auth fallida (mensaje genérico), `403` autorización por rol, `404` recurso no existe, `409` conflicto de lock, `422` validación.
- Mensaje de auth fallida es **genérico**: "Credenciales inválidas". No revelar si el email existe (HU-01 borde).

### 5.3 Servicios sin Express

`service.ts` recibe args tipados, no `req`/`res`. Facilita testing.

### 5.4 Locks pesimistas — reglas críticas

1. **`POST /tickets/:id/lock` es IDEMPOTENTE** (EC-MVP-01, score 9 CRÍTICO):
   - Si el solicitante ya tiene un lock vigente → retornar `200` con el lock existente (sin duplicar registro).
   - Si hay un lock vigente de otro usuario → `409` con `{lockedBy, lockedAt, expiresAt}`.
   - Si no hay lock o expiró → adquirirlo y retornar `200`.
   - El cliente debe hacer `GET /tickets/:id/lock` al montar la vista de edición para reconciliar estado tras posibles fallas de red.
2. **Cambio de estado** requiere lock vigente del usuario. Sin lock → `409` "Debes adquirir el bloqueo de edición antes de modificar el ticket" (HU-07).
3. **El lock se libera en**: save exitoso, cancel/cierre del modal (cliente llama `DELETE`), **timeout 15 min** automático (configurable vía `LOCK_TIMEOUT_MINUTES`).
4. **Comentarios no requieren ni respetan el lock** (PRD §2.4, HU-10).
5. **Force unlock por Admin (TC-307) está DIFERIDO a v1.1**. No implementar en MVP.
6. **Implementación T-SQL** (SQL Server):
   - Adquirir/renovar lock: `MERGE` sobre `ticket_lock` con condición `expires_at < SYSUTCDATETIME() OR locked_by = @userId`.
   - Lectura concurrente segura: `SELECT ... FROM ticket_lock WITH (UPDLOCK, ROWLOCK) WHERE ticket_id = @id`.

### 5.5 Auditoría

- `AuditLog` se escribe en la **misma transacción** que el cambio del ticket. Si el log falla, el cambio se revierte.
- `AuditLog` es **inmutable** a nivel app (sin endpoints de update/delete). Post-MVP: revocar `UPDATE`/`DELETE` al usuario de aplicación a nivel SQL Server (`DENY UPDATE/DELETE ON audit_log`).
- Cualquier cambio en `ticket.status` **debe** generar registro: el dashboard depende de esto.

### 5.6 Soft delete

- Nunca `DELETE`. Siempre `archived_at` (Project, Ticket) o `deleted_at` (Comment).
- Filtrar `WHERE archived_at IS NULL` por defecto. Las queries de "Archivados" lo invierten explícitamente con `?archived=true`.
- Re-archivar es idempotente: actualiza `archived_at` al timestamp actual, retorna 200.

### 5.7 Email transaccional — fire-and-forget

```ts
await db.ticketAssignee.createMany({ ... });

emailProvider
  .send(notifyAssigneeMail(ticket, assignees))
  .catch(err => logger.error({ err, event: 'email_failed' }));

return ticket;
```

- Si el proveedor falla → log + sigue. **No revertir la operación de negocio** (HU-15 borde).
- Múltiples destinatarios → un envío por destinatario (HU-09, HU-15).
- Auto-mención no notifica (HU-16).
- Menciones a usuarios inexistentes se ignoran sin error (HU-16).

### 5.8 Restricciones a nivel BD (no negociables)

- `ticket.created_by NOT NULL` enforced **en SQL Server**, no solo en Prisma (EC-MVP-02, score 6 ALTO).
- `audit_log.actor_id NOT NULL` enforced en SQL Server.
- FK con `ON DELETE NO ACTION` (nunca cascadas — todo es soft delete).
- `ticket_lock` con PK `ticket_id` (un solo lock por ticket).
- `comment.body` con check `LEN(body) > 0`.

### 5.9 Roles y autorización

- Middleware `requireProjectRole(['ADMIN'])` lee `req.user.id` + `req.params.projectId` y consulta `ProjectMember`.
- **No** asumir rol global. Un usuario puede ser Admin en P1 y User en P2 (HU-02).
- JWT payload: `{ user_id, roles: { [project_id]: 'ADMIN' | 'USER' } }`.
- Refresh token TTL 7 días, access TTL 1 hora.

---

## 6. Modelo de datos

Esquema canónico en `database-schema.yaml`. Prisma schema en `backend/prisma/schema.prisma` con `provider = "sqlserver"`.

```
User           { id, name, email (unique), password_hash, created_at }
Project        { id, name, description?, archived_at?, created_by FK→User }
ProjectMember  { id, user_id FK, project_id FK, role: 'ADMIN'|'USER' }
Priority       { id, name: 'Alta'|'Media'|'Baja', order: int }   ← TABLA, no enum
Tag            { id, name, color }                               ← catálogo global
Ticket         { id, title (≤255), description?, status: enum,
                 priority_id FK→Priority, project_id FK→Project,
                 created_by FK→User (NOT NULL),
                 archived_at?, created_at, updated_at }
TicketAssignee { ticket_id FK, user_id FK, PK(ticket_id, user_id) }
TicketTag      { ticket_id FK, tag_id FK, PK(ticket_id, tag_id) }
Comment        { id, ticket_id FK, user_id FK, body (>0), created_at, deleted_at? }
AuditLog       { id, ticket_id FK, field, old_value, new_value,
                 actor_id FK→User (NOT NULL), timestamp }
TicketLock     { ticket_id PK FK, locked_by FK→User, locked_at, expires_at }
```

**Status del ticket** — el conector Prisma de SQL Server no soporta `enum` nativo. Se modela como string con CHECK constraint añadido en migración raw:
- `ticket.status IN ('Por hacer', 'En progreso', 'Listo')`
- `project_member.role IN ('ADMIN', 'USER')`

Las transiciones son libres (cualquier estado → cualquier estado, PRD §2.3, HU-07).

**Convenciones T-SQL aplicadas en migraciones y queries raw:**
- Identificadores reservados como `order` van entre corchetes: `[order]`.
- Timestamps con zona: `DATETIMEOFFSET` y `SYSUTCDATETIME()`.
- Upserts con `MERGE`. Devolver filas afectadas con `OUTPUT INSERTED.*`.
- Locks de fila: `WITH (UPDLOCK, ROWLOCK)`.
- Booleanos: `BIT`. Texto largo: `NVARCHAR(MAX)`.

---

## 7. Variables de entorno

`.env.example` en raíz. Cada app tiene su `.env`. Validadas con Zod en `backend/src/lib/env.ts`. Si falta una requerida, el proceso aborta en arranque.

Variables clave: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `BCRYPT_COST`, `LOCK_TIMEOUT_MINUTES`, `EMAIL_PROVIDER`, `CORS_ORIGIN`, `PORT`, `VITE_API_BASE_URL`.

Cadena de conexión típica:
```
DATABASE_URL="sqlserver://localhost:1433;database=minijira;user=sa;password=...;encrypt=true;trustServerCertificate=true"
```

---

## 8. Comandos de desarrollo

> Docker corre **dentro de WSL** en este Windows. Los comandos `docker` se invocan desde PowerShell con prefijo `wsl ` (ej: `wsl docker ps`). El laptop ya tiene un container llamado **`SQLServer2022`** (imagen `mcr.microsoft.com/mssql/server:2022-latest`) escuchando en `:1433` — Mini Jira lo reutiliza.
>
> Conflictos de puerto: `:3000` ocupado por `admosa_grafana` → backend corre en **`:3030`**. `:5173` libre. `:1433` ya servido por `SQLServer2022`.

### 8.1 Setup inicial

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
# Editar backend\.env con el sa-password real del container SQLServer2022.

wsl docker exec -i SQLServer2022 /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P 'TU_SA_PASSWORD' -No `
  -Q "IF DB_ID('minijira') IS NULL CREATE DATABASE minijira"

cd backend;  pnpm install
cd ..\frontend; pnpm install

cd ..\backend; pnpm prisma:migrate; pnpm db:seed
```

### 8.2 Día a día

```powershell
# Terminal A — backend
cd backend; pnpm dev          # API en http://localhost:3030/api/v1

# Terminal B — frontend
cd frontend; pnpm dev         # Web en http://localhost:5173
```

Docs API (Swagger UI): http://localhost:3030/api/v1/docs

### 8.3 Greenfield (otra máquina sin SQLServer2022)

```powershell
wsl docker compose up -d      # levanta minijira-db en :1433
```

### 8.4 Comandos por app

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Vite dev server (frontend) / tsx watch (backend) |
| `pnpm build` | Build de producción |
| `pnpm test` | Vitest (unit + integración con supertest) |
| `pnpm lint` | ESLint con `--max-warnings 0` |
| `pnpm format` | Prettier write |
| `pnpm prisma:migrate` | Aplica migraciones (backend) |
| `pnpm prisma:studio` | UI de inspección de BD (backend) |
| `pnpm db:seed` | Seed con datos demo (backend) |
| `pnpm typecheck` | `tsc -b --noEmit` (frontend) |

Antes de PR: `pnpm lint && pnpm test` en ambas carpetas pasa en verde.

---

## 9. Reglas de negocio críticas (resumen ejecutable)

Trampas frecuentes — leer antes de tocar tickets/locks/auditoría.

1. **Solo Admin de proyecto** archiva tickets, asigna usuarios y gestiona el catálogo de tags. El usuario asignado **sí** puede cambiar estado y editar campos del ticket asignado (PRD §2.1, §2.3; HU-02, HU-08, HU-09).
2. **Cambio de estado requiere lock vigente** del usuario. Comentar **no** requiere lock (HU-07, HU-10).
3. **Lock idempotente**: `POST /tickets/:id/lock` por el mismo usuario que ya lo tiene retorna 200 con el lock existente (EC-MVP-01).
4. **Soft delete universal**: el botón dice "Eliminar" pero la API hace UPDATE de `archived_at`. **Nunca** `DELETE` físico.
5. **AuditLog inmutable**: sin endpoints de update/delete; en producción el usuario de BD no debe tener permisos `UPDATE`/`DELETE` sobre `audit_log` (TC-203).
6. **Email a todos los asignados** cuando aplique. Múltiples destinatarios = múltiples envíos. Falla de email NO revierte la operación (HU-15 borde).
7. **Transiciones de estado libres**: cualquier estado puede ir a cualquier otro. No validar grafos (HU-07).
8. **Lock se libera en**: save, cancel, cierre de modal, **timeout 15 min** (configurable por env). Polling del banner cada 30s.
9. **Mensaje de login fallido genérico**: nunca revelar si el email existe (HU-01 borde).
10. **`created_by` y `actor_id` NOT NULL en BD**: enforced en SQL Server, no solo en Prisma (EC-MVP-02).

---

## 10. Qué NO hacer

- No agregar dependencias sin justificación. La lista de §1 es el set autorizado; cualquier extra requiere mención en el PR.
- No introducir Redux, MobX, Recoil, Jotai. Server state → TanStack Query; UI state → Zustand.
- No implementar features marcadas como **Out-of-Scope** en PRD §3 (modo oscuro, websockets, adjuntos, sub-tareas, integraciones, superadmin, bulk assign, estados configurables, exportación, API pública).
- No commitear secretos. `.env` está en `.gitignore`; sólo `.env.example` se versiona.
- No usar `any` en TypeScript. Si genuinamente no se conoce el tipo, `unknown` + narrowing.
- No hacer commits con `--no-verify` ni saltar hooks de pre-commit.
- No implementar `force unlock` (TC-307) — diferido a v1.1.
- La autenticación es JWT propio con bcryptjs — no añadir proveedores externos de auth.
