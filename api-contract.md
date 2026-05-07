# API Contract — Mini Jira v1

**Versión:** 1.0 (draft)
**Base URL:** `/api/v1`
**Stack:** Node + TypeScript + Express + Prisma + SQL Server
**Fuentes:**
- `frontend/src/lib/types.ts`, `mock-data.ts`
- `frontend/src/store/kanbanStore.ts`, `projectsStore.ts`
- `Specs-MiniJira/full-backlog.md` (16 HUs)
- `Base-Specs/specs.md`, `architecture.md`, `er.md`, `secuencia.md`, `TestPlan.md`

---

## 1. Convenciones globales

### 1.1 Envelope

- **Success:** retorna el recurso/colección directamente, sin wrapper. Status `2xx`.
- **Error:** body siempre `{ "error": { "code": string, "message": string, "details"?: object } }` con status `4xx`/`5xx`.

### 1.2 Casing y tipos

- JSON en **camelCase** (`archivedAt`, `createdBy`, `priorityId`).
- BD en snake_case (Prisma `@map` maneja la conversión).
- IDs **numéricos** (Int) en BD y JSON. Los identificadores tipo `'p1'` / `'u1'` / `'T-112'` del mock son sólo para el prototipo; el backend usa enteros (`1`, `2`, ...). El frontend deberá migrar al integrar.
- Fechas en ISO 8601 UTC: `"2026-04-14T10:00:00.000Z"`.
- Status del ticket en **literal español** (`"Por hacer"` / `"En progreso"` / `"Listo"`) por consistencia con `mock.sql` y `audit_log`.
- Prioridad expuesta como objeto `{ id, name, order }` porque `Priority` es tabla, no enum (ER §er.md).

### 1.3 Autenticación

- **Header:** `Authorization: Bearer <accessToken>` en endpoints protegidos. Sin cookies → CSRF no aplica.
- Access token JWT TTL `1h`; refresh token TTL `7d`.
- **Refresh rotation single-use**: cada `POST /auth/refresh` invalida el refresh token entrante y emite uno nuevo. Si el mismo refresh se usa dos veces → 401 `refresh_expired` y se invalida toda la cadena (signal de robo del token).
- Payload JWT: `{ sub: userId, roles: { [projectId: string]: 'ADMIN' | 'USER' }, iat, exp }` (HU-01).

### 1.4 Paginación cursor-based

Aplica a listas potencialmente grandes (tickets, comments, audit log).

```
GET /api/v1/projects/:projectId/tickets?limit=20
→ 200
{
  "items": [ ... ],
  "nextCursor": "eyJpZCI6MTAwfQ==",
  "hasMore": true
}

GET /api/v1/projects/:projectId/tickets?cursor=eyJpZCI6MTAwfQ==&limit=20
→ 200
{ "items": [ ... ], "nextCursor": null, "hasMore": false }
```

- `cursor` es base64-url de `{ id: lastSeenId }` (oporco a la API; no se documenta su forma interna al cliente).
- `limit` min 1, max 100, default 20.
- Si `nextCursor === null` → el cliente paró de paginar.

### 1.5 Filtros

Los filtros van en query string como listas separadas por coma:
```
?status=todo,progress
?priority=high
?tag=1,2
?assignee=4
?q=texto
```
Los filtros aplican AND entre keys, OR dentro de la misma key (multivalor).

### 1.6 Códigos de error

| HTTP | code | Cuándo se usa |
|---|---|---|
| 400 | `bad_request` | Body malformado, JSON inválido |
| 401 | `unauthorized` | Sin token o token expirado |
| 401 | `invalid_credentials` | Login fallido (mensaje genérico, sin revelar existencia del email — HU-01) |
| 401 | `refresh_expired` | Refresh token vencido |
| 403 | `forbidden_role` | Rol insuficiente (Usuario intenta acción de Admin) |
| 403 | `forbidden_member` | Usuario no es miembro del proyecto |
| 404 | `not_found` | Recurso no existe (o no tienes permiso para verlo) |
| 409 | `ticket_locked` | Lock activo de otro usuario (incluye `details: {lockedBy, lockedAt, expiresAt}`) |
| 409 | `lock_required` | Cambio de estado sin lock activo (HU-07 borde) |
| 409 | `lock_expired` | Tu lock expiró antes de guardar (HU-12 borde) |
| 409 | `idempotent_no_op` | Ej: archivar ticket ya archivado (informativo, devuelve 200) |
| 422 | `validation_error` | Zod falló; `details` mapea campo→error |
| 500 | `internal_error` | Catch-all genérico |

### 1.7 Reglas transversales

- **Soft delete universal**: `archived_at` (Project, Ticket) o `deleted_at` (Comment). Nunca DELETE físico.
- **AuditLog**: se escribe en la misma transacción que el cambio de `ticket.status`. Inmutable.
- **Lock idempotente** (EC-MVP-01 score 9): `POST /tickets/:id/lock` por el mismo usuario que ya lo tiene retorna 200.
- **`force unlock` (TC-307) NO está en MVP** — diferido a v1.1.
- **Email** se envía fire-and-forget desde el handler (asignación, mención). Falla del email NO revierte la operación.
- **Mensajes de auth** son genéricos (HU-01).

---

## 2. P0 — Bloquean el flujo principal

Auth, CRUD de tickets, CRUD de proyectos. Sin esto el MVP no funciona.

---

### 2.1 Auth

#### `POST /api/v1/auth/login`

**Auth:** público.

**Request:**
```json
{ "email": "ana@empresa.com", "password": "********" }
```

**Success — 200**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "name": "Ana Martínez",
    "email": "ana@empresa.com"
  },
  "roles": { "1": "ADMIN", "2": "USER" }
}
```

**Errores:**
- `401 invalid_credentials` — email o password incorrectos (mismo mensaje en ambos casos).
- `422 validation_error` — campos faltantes o formato inválido.

**Reglas:** HU-01. Bcrypt cost ≥12. No revelar si el email existe.

---

#### `POST /api/v1/auth/refresh`

**Auth:** público (cookie httpOnly o body).

**Request:**
```json
{ "refreshToken": "eyJhbGciOi..." }
```

**Success — 200**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "expiresIn": 3600
}
```

**Errores:**
- `401 refresh_expired` — refresh token vencido o inválido.

---

#### `POST /api/v1/auth/logout`

**Auth:** Bearer.

**Request:** sin body.

**Success — 204** (sin body).

**Errores:** `401 unauthorized`.

**Notas:** invalida el refresh token actual (lista negra o rotación). Access token simplemente expira solo.

---

### 2.2 Projects (lista, detalle, CRUD básico)

#### `GET /api/v1/projects`

**Auth:** Bearer.

**Query params:**
| Param | Tipo | Default | Notas |
|---|---|---|---|
| `archived` | boolean | `false` | `true` lista solo archivados |
| `q` | string | — | búsqueda case-insensitive en `name` |
| `cursor` | string | — | paginación |
| `limit` | int | 20 | max 100 |

**Success — 200**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Plataforma Core",
      "description": "Backend y APIs principales del producto",
      "archivedAt": null,
      "createdBy": 1,
      "createdAt": "2026-04-01T09:00:00.000Z",
      "myRole": "ADMIN",
      "memberCount": 6,
      "openTicketCount": 28,
      "lastActivityAt": "2026-04-19T16:20:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Notas:**
- `myRole` es el rol del usuario autenticado en ese proyecto.
- Solo lista proyectos donde el usuario es miembro (no leak global).
- `memberCount`, `openTicketCount`, `lastActivityAt` son aggregates server-side.

**Reglas:** HU-03, HU-04. Filtro `archived` corresponde al tab "Archivados" del frontend.

---

#### `GET /api/v1/projects/:projectId`

**Auth:** Bearer + miembro del proyecto.

**Success — 200**
```json
{
  "id": 1,
  "name": "Plataforma Core",
  "description": "Backend y APIs principales del producto",
  "archivedAt": null,
  "createdBy": 1,
  "createdAt": "2026-04-01T09:00:00.000Z",
  "myRole": "ADMIN",
  "memberCount": 6,
  "openTicketCount": 28
}
```

**Errores:**
- `403 forbidden_member`
- `404 not_found`

---

#### `POST /api/v1/projects`

**Auth:** Bearer.

**Request:**
```json
{ "name": "Rediseño Web", "description": "Renovación visual y de UX" }
```

**Success — 201**
```json
{
  "id": 6,
  "name": "Rediseño Web",
  "description": "Renovación visual y de UX",
  "archivedAt": null,
  "createdBy": 1,
  "createdAt": "2026-05-06T10:00:00.000Z",
  "myRole": "ADMIN",
  "memberCount": 1,
  "openTicketCount": 0
}
```

**Errores:**
- `422 validation_error` (`name` obligatorio, max 255).

**Reglas:** HU-03. El creador queda automáticamente como `ADMIN` del proyecto. Nombres NO únicos globalmente (HU-03 borde).

---

#### `PATCH /api/v1/projects/:projectId`

**Auth:** Bearer + Admin del proyecto.

**Request (parcial):**
```json
{ "name": "Plataforma Core 2.0", "description": "..." }
```

**Success — 200** retorna el Project actualizado (mismo shape que GET).

**Errores:**
- `403 forbidden_role` — solo Admin del proyecto.
- `422 validation_error`.

---

#### `PATCH /api/v1/projects/:projectId/archive`

**Auth:** Bearer + Admin del proyecto.

**Request:** sin body.

**Success — 200**
```json
{ "id": 1, "archivedAt": "2026-05-06T10:00:00.000Z" }
```

**Notas:**
- Idempotente: si ya estaba archivado, actualiza `archivedAt` al timestamp actual y retorna 200 (HU-04 borde).
- Soft delete; jamás DELETE físico.

**Errores:** `403 forbidden_role`.

---

### 2.3 Tickets — CRUD core

#### `GET /api/v1/projects/:projectId/tickets`

**Auth:** Bearer + miembro del proyecto.

**Query params:**
| Param | Tipo | Notas |
|---|---|---|
| `status` | comma-list | `Por hacer,En progreso,Listo` |
| `priority` | comma-list | `Alta,Media,Baja` (o ids) |
| `tag` | comma-list ints | tag ids |
| `assignee` | comma-list ints | user ids |
| `q` | string | búsqueda case-insensitive en `title` |
| `archived` | boolean | default `false` |
| `cursor`, `limit` | — | paginación |

**Success — 200**
```json
{
  "items": [
    {
      "id": 112,
      "title": "Rediseñar la página de inicio",
      "description": "...",
      "status": "En progreso",
      "priority": { "id": 1, "name": "Alta", "order": 1 },
      "projectId": 1,
      "createdBy": 1,
      "archivedAt": null,
      "createdAt": "2026-04-14T10:00:00.000Z",
      "updatedAt": "2026-04-18T11:40:00.000Z",
      "assignees": [
        { "id": 1, "name": "Laura Méndez" },
        { "id": 2, "name": "Carlos Rivas" }
      ],
      "tags": [
        { "id": 2, "name": "feature", "color": "#0071e3" }
      ],
      "commentCount": 5,
      "lock": null
    }
  ],
  "nextCursor": "...",
  "hasMore": true
}
```

**Notas:**
- `lock` es `null` si no hay bloqueo activo, o `{ lockedBy: {id, name}, lockedAt, expiresAt }` si lo hay.
- Filtros AND entre keys, OR dentro de cada key.

**Reglas:** HU-13.

---

#### `GET /api/v1/tickets/:ticketId`

**Auth:** Bearer + miembro del proyecto del ticket.

**Success — 200** mismo shape que `items[]` arriba, pero con `description` completa siempre.

**Errores:**
- `403 forbidden_member`
- `404 not_found`

---

#### `POST /api/v1/projects/:projectId/tickets`

**Auth:** Bearer + miembro del proyecto.

**Request:**
```json
{
  "title": "Corregir error 500 en /auth/refresh",
  "description": "...",                // opcional
  "priorityId": 1,                     // obligatorio
  "status": "Por hacer",               // opcional, default "Por hacer"
  "assigneeIds": [2],                  // opcional
  "tagIds": [1, 4]                     // opcional
}
```

**Success — 201** retorna el Ticket completo (mismo shape que GET).

**Errores:**
- `403 forbidden_member`
- `422 validation_error` — `title` obligatorio max 255 (HU-05 borde), `priorityId` obligatorio (HU-05 borde), todo `assigneeId` debe ser miembro del proyecto (HU-09 borde).

**Reglas:** HU-05. `createdBy` se setea automáticamente desde el JWT — `created_by` `NOT NULL` enforced en BD (EC-MVP-02). Auditoría inicial NO se registra (no hay cambio de status; solo creación).

---

#### `PATCH /api/v1/tickets/:ticketId`

**Auth:** Bearer + (Admin del proyecto **o** asignado al ticket).

**Request (parcial):**
```json
{
  "title": "...",
  "description": "...",
  "priorityId": 2,
  "tagIds": [1, 5]
}
```

**Notas importantes:**
- **NO** se puede cambiar `status` aquí — usar `PATCH /tickets/:id/status`.
- **NO** se puede cambiar `assignees` aquí — usar `PATCH /tickets/:id/assignees`.
- **Requiere lock activo del usuario** (regla derivada de PRD §2.5: edición → lock).
- Cualquier cambio actualiza `updated_at` y registra el actor.

**Success — 200** retorna el Ticket actualizado.

**Errores:**
- `403 forbidden_role` (Usuario no asignado intentando editar — HU-06 borde).
- `409 lock_required` — sin lock activo.
- `409 lock_expired` — el lock expiró durante la edición.
- `422 validation_error`.

**Reglas:** HU-06.

---

#### `PATCH /api/v1/tickets/:ticketId/status`

**Auth:** Bearer + (Admin del proyecto **o** asignado al ticket).

**Request:**
```json
{ "status": "Listo" }
```

**Success — 200**
```json
{
  "id": 112,
  "status": "Listo",
  "updatedAt": "2026-05-06T10:00:00.000Z"
}
```

**Reglas críticas:**
- **Requiere lock activo del usuario** (HU-07 borde, secuencia.md). Sin lock → 409.
- Transiciones libres: cualquier estado → cualquier otro (HU-07).
- Genera `AuditLog` en la misma transacción (HU-07, TC-203).
- Libera el lock automáticamente tras éxito (secuencia.md paso 6).

**Errores:**
- `403 forbidden_role`.
- `409 lock_required` (HU-07 borde).
- `409 lock_expired`.
- `422 validation_error` — status fuera del catálogo (HU-07 borde).

---

#### `PATCH /api/v1/tickets/:ticketId/archive`

**Auth:** Bearer + Admin del proyecto.

**Request:** sin body.

**Success — 200**
```json
{ "id": 112, "archivedAt": "2026-05-06T10:00:00.000Z" }
```

**Notas:**
- Idempotente: re-archivar actualiza `archivedAt` y retorna 200 (HU-08 borde).
- El AuditLog del ticket queda intacto (HU-08).

**Errores:** `403 forbidden_role` (HU-08 borde — Usuario regular no puede archivar).

**Reglas:** HU-08. Soft delete; nunca DELETE físico.

---

## 3. P1 — Importantes pero no bloqueantes

Comentarios, asignados, etiquetas, locks, miembros del proyecto.

---

### 3.1 Pessimistic Locking

#### `GET /api/v1/tickets/:ticketId/lock`

**Auth:** Bearer + miembro del proyecto.

**Success — 200**
```json
{
  "lockedBy": { "id": 2, "name": "Carlos Rivas" },
  "lockedAt": "2026-05-06T10:00:00.000Z",
  "expiresAt": "2026-05-06T10:15:00.000Z",
  "isMine": false
}
```

O si no hay lock o expiró:
```json
null
```

**Notas:** el cliente debe llamar este endpoint al montar el editor para reconciliar tras una posible falla de red (EC-MVP-01).

---

#### `POST /api/v1/tickets/:ticketId/lock`

**Auth:** Bearer + (Admin del proyecto **o** asignado al ticket).

**Request:** sin body.

**Success — 200**
```json
{
  "lockedBy": { "id": 1, "name": "Ana Martínez" },
  "lockedAt": "2026-05-06T10:00:00.000Z",
  "expiresAt": "2026-05-06T10:15:00.000Z",
  "isMine": true
}
```

**Reglas críticas:**
- **Idempotente** (EC-MVP-01 score 9 CRÍTICO): si el solicitante ya tiene lock vigente, retorna 200 con el lock existente sin duplicar.
- Si hay lock activo de otro usuario → `409 ticket_locked` con `details: {lockedBy, lockedAt, expiresAt}`.
- Si no hay lock o expiró → adquiere y retorna 200.
- TTL configurado vía env `LOCK_TIMEOUT_MINUTES` (default 15).

**Implementación T-SQL** (no contractual, solo guía):
```
MERGE ticket_lock WITH (UPDLOCK, ROWLOCK)
ON ticket_id = @id
WHEN MATCHED AND (expires_at < SYSUTCDATETIME() OR locked_by = @userId)
  THEN UPDATE SET locked_by = @userId, locked_at = ..., expires_at = ...
WHEN NOT MATCHED
  THEN INSERT ...
```

**Errores:**
- `403 forbidden_role` — usuario no asignado ni Admin.
- `409 ticket_locked` — lock activo de otro.

**Reglas:** HU-12, EC-MVP-01.

---

#### `DELETE /api/v1/tickets/:ticketId/lock`

**Auth:** Bearer + dueño del lock.

**Success — 204** (sin body).

**Notas:**
- Solo libera el lock si el solicitante es el dueño. Si no, `403 forbidden_role`.
- **`?force=true` NO está en MVP** (TC-307 diferido a v1.1).
- Idempotente: si no hay lock, retorna 204.

**Errores:**
- `403 forbidden_role` — el lock no es tuyo.

---

### 3.2 Asignaciones

#### `PATCH /api/v1/tickets/:ticketId/assignees`

**Auth:** Bearer + Admin del proyecto.

**Request:**
```json
{ "assigneeIds": [2, 3] }
```

**Success — 200** retorna el Ticket completo con la lista actualizada de asignados.

**Reglas:**
- Reemplaza la lista completa (no es PATCH parcial). Quitar todos: `assigneeIds: []`.
- Cada `assigneeId` debe ser miembro del proyecto (HU-09 borde) → `422 validation_error` `{ "assigneeIds": "El usuario X no es miembro del proyecto" }`.
- **Side-effect:** dispara email de asignación a cada **nuevo** asignado (no a los que ya estaban). Fire-and-forget; falla del email no revierte (HU-15 borde).

**Errores:**
- `403 forbidden_role` (HU-09 borde).
- `422 validation_error`.

**Reglas:** HU-09.

---

### 3.3 Comments

#### `GET /api/v1/tickets/:ticketId/comments`

**Auth:** Bearer + miembro del proyecto.

**Query params:** `cursor`, `limit`.

**Success — 200**
```json
{
  "items": [
    {
      "id": 1,
      "ticketId": 112,
      "user": { "id": 2, "name": "Carlos Rivas" },
      "body": "Reproduje el bug localmente...",
      "createdAt": "2026-04-14T14:22:00.000Z",
      "deletedAt": null,
      "canEdit": true,
      "canDelete": true
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Notas:**
- `canEdit` true si `user.id === currentUser.id` (autor).
- `canDelete` true si autor o Admin del proyecto.
- Comentarios soft-deleted (`deletedAt != null`) se omiten por default.

---

#### `POST /api/v1/tickets/:ticketId/comments`

**Auth:** Bearer + (Admin del proyecto **o** asignado al ticket).

**Request:**
```json
{ "body": "Avance al 50%. @diana ¿podrías revisar?" }
```

**Success — 201** retorna el Comment creado.

**Reglas:**
- **NO requiere lock** (HU-10, PRD §2.4).
- Detecta menciones `@username` y dispara email a cada usuario mencionado (HU-16). Auto-mención no notifica. Mención inexistente se ignora silenciosamente.
- `body` no puede ser vacío (`LEN(body) > 0` constraint en BD; 422 si vacío — HU-10 borde).

**Errores:**
- `403 forbidden_role` — usuario no asignado ni Admin (HU-10 borde).
- `422 validation_error`.

**Reglas:** HU-10.

---

#### `PATCH /api/v1/comments/:commentId`

**Auth:** Bearer + autor del comentario.

**Request:**
```json
{ "body": "Texto corregido" }
```

**Success — 200** retorna el Comment actualizado.

**Errores:**
- `403 forbidden_role` — no eres el autor.
- `404 not_found` — soft-deleted (HU-11 borde).

**Reglas:** HU-11.

---

#### `DELETE /api/v1/comments/:commentId`

**Auth:** Bearer + (autor del comentario **o** Admin del proyecto).

**Success — 204**.

**Notas:** soft delete (`deletedAt = NOW()`). Nunca DELETE físico.

**Errores:** `403 forbidden_role`.

**Reglas:** HU-11.

---

### 3.4 Tags (catálogo global)

#### `GET /api/v1/tags`

**Auth:** Bearer.

**Success — 200**
```json
[
  { "id": 1, "name": "bug", "color": "#EF4444" },
  { "id": 2, "name": "feature", "color": "#3B82F6" }
]
```

**Notas:** sin paginación; se asume catálogo pequeño (<100 tags). Si crece, agregar paginación en v1.1.

---

#### `POST /api/v1/tags`

**Auth:** Bearer + cualquier rol Admin (en cualquier proyecto). Ver §6.3 de CLAUDE.md sobre la ambigüedad.

**Request:**
```json
{ "name": "deuda-técnica", "color": "#6B7280" }
```

**Success — 201** retorna el Tag creado.

**Errores:** `403 forbidden_role`, `422 validation_error` (color en formato `#RRGGBB`).

---

#### `PATCH /api/v1/tags/:tagId`

**Auth:** Bearer + cualquier rol Admin.

**Request (parcial):**
```json
{ "name": "tech-debt", "color": "#9CA3AF" }
```

**Success — 200** retorna el Tag actualizado.

---

#### `DELETE /api/v1/tags/:tagId`

**Auth:** Bearer + cualquier rol Admin.

**Success — 204**.

**Notas:** elimina las relaciones `ticket_tag` también (cascada controlada por app, no por FK). El tag desaparece de los tickets que lo tenían.

---

### 3.5 Project members

#### `GET /api/v1/projects/:projectId/members`

**Auth:** Bearer + miembro del proyecto.

**Success — 200**
```json
[
  { "userId": 1, "name": "Laura Méndez", "role": "ADMIN", "addedAt": "2026-04-01T09:00:00.000Z" },
  { "userId": 2, "name": "Carlos Rivas", "role": "USER", "addedAt": "2026-04-02T10:00:00.000Z" }
]
```

---

#### `POST /api/v1/projects/:projectId/members`

**Auth:** Bearer + Admin del proyecto.

**Request:**
```json
{ "userId": 3, "role": "USER" }
```

**Success — 201** retorna el ProjectMember creado.

**Errores:** `403 forbidden_role`, `422 validation_error` (userId duplicado, role inválido).

---

#### `PATCH /api/v1/projects/:projectId/members/:userId`

**Auth:** Bearer + Admin del proyecto.

**Request:**
```json
{ "role": "ADMIN" }
```

**Success — 200**.

**Notas:** no permite quitarse a uno mismo el rol Admin si quedaría el proyecto sin Admin (`422 validation_error` `last_admin`). Garantía: cada proyecto tiene ≥1 Admin.

---

#### `DELETE /api/v1/projects/:projectId/members/:userId`

**Auth:** Bearer + Admin del proyecto.

**Success — 204**.

**Notas:** mismo guard de "último Admin" que en PATCH. Quitar un miembro no archiva sus tickets, pero el ex-miembro pierde permisos (HU-09 escenario "Admin quita asignado"). El usuario removido NO podrá editar tickets (a menos que sea Admin global del proyecto).

---

## 4. P2 — Mejoras y reportes

Dashboard, audit log lectura, búsqueda avanzada. Pueden ir en semana 3 o post-MVP.

---

### 4.1 Dashboard

#### `GET /api/v1/projects/:projectId/dashboard`

**Auth:** Bearer + miembro del proyecto.

**Query params:**
| Param | Tipo | Notas |
|---|---|---|
| `from` | ISO date | inicio del rango histórico (default 12 meses atrás) |
| `to` | ISO date | fin del rango (default hoy) |

**Success — 200**
```json
{
  "closedByMonth": [
    { "month": "2026-03", "count": 8 },
    { "month": "2026-04", "count": 12 },
    { "month": "2026-05", "count": 3 }
  ],
  "byCurrentStatus": {
    "Por hacer": 5,
    "En progreso": 4,
    "Listo": 3
  },
  "byPriority": {
    "Alta": 4,
    "Media": 5,
    "Baja": 3
  }
}
```

**Notas:**
- `closedByMonth` se calcula del `audit_log` filtrando entradas donde `field='status' AND new_value='Listo'` agrupadas por mes del `timestamp` (PRD §2.7, HU-14).
- Edge case: ticket que pasa a "Listo" y luego vuelve a "En progreso" — se contabiliza en el mes que llegó a "Listo" para el histórico, y refleja el estado actual en `byCurrentStatus` (HU-14 borde).
- `byCurrentStatus` y `byPriority` se calculan sobre tickets activos (`archived_at IS NULL`).
- Si el proyecto no tiene tickets, todos los conteos son 0 sin error de división (HU-14 borde).

**Reglas:** HU-14.

---

### 4.2 Audit log (lectura)

#### `GET /api/v1/tickets/:ticketId/audit-log`

**Auth:** Bearer + miembro del proyecto.

**Query params:** `cursor`, `limit`.

**Success — 200**
```json
{
  "items": [
    {
      "id": 1,
      "ticketId": 112,
      "field": "status",
      "oldValue": "Por hacer",
      "newValue": "En progreso",
      "actor": { "id": 1, "name": "Ana Martínez" },
      "timestamp": "2026-04-18T11:40:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Notas:**
- **Solo lectura**. NO existe endpoint `PATCH` ni `DELETE` para audit log (inmutable, TC-203).
- En producción, el usuario de BD del backend NO debe tener permisos `UPDATE/DELETE` sobre `audit_log` (defensa en profundidad).

**Reglas:** PRD §2.3.

---

### 4.3 Búsqueda global

#### `GET /api/v1/search`

**Auth:** Bearer.

**Query params:**
| Param | Tipo | Notas |
|---|---|---|
| `q` | string | obligatorio, min 2 chars |
| `type` | enum | `tickets`,`projects`,`comments`,`all` (default `all`) |
| `cursor`, `limit` | — | paginación |

**Success — 200**
```json
{
  "items": [
    { "kind": "ticket", "id": 112, "title": "...", "projectId": 1, "snippet": "..." },
    { "kind": "project", "id": 3, "name": "...", "snippet": "..." }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Notas:**
- Solo retorna recursos del workspace del usuario (proyectos donde es miembro).
- `snippet` es un highlight server-side del match.
- Implementación inicial: LIKE en SQL Server. Migrar a Full-Text Search si crece.

**Reglas:** PRD §2.6 (búsqueda por texto en título — extensión a comments + projects es P2).

---

### 4.4 Filtros guardados (opcional v1.1)

`GET/POST/DELETE /api/v1/me/saved-filters` — fuera de scope MVP, mencionado para futuro deep-linking de filtros frecuentes.

---

## 5. Lo que NO entra en el contrato (out-of-scope MVP per PRD §3)

| Endpoint hipotético | Por qué no |
|---|---|
| `PATCH /tickets/:id/lock?force=true` | TC-307 diferido a v1.1 |
| `WebSocket /ws/projects/:id/notifications` | PRD §3 fuera de scope |
| `POST /tickets/:id/attachments` | sin adjuntos en MVP |
| `POST /tickets/:id/subtasks` | sin sub-tareas en MVP |
| `POST /webhooks/...` | sin API pública / webhooks |
| `GET /export/projects/:id.csv` | sin exportación |
| `POST /admin/promote` | sin superadmin |
| `POST /tickets/bulk-assign` | sin bulk operations |

---

## 6. Mapeo a operaciones del frontend actual

Lo que ya hace el FE (mock-only) y a qué endpoint mapeará cuando se conecte:

| Operación FE | Endpoint backend |
|---|---|
| `useProjects()` carga inicial | `GET /api/v1/projects?archived=false` |
| Tab "Archivados" | `GET /api/v1/projects?archived=true` |
| Búsqueda en ProjectsScreen | `GET /api/v1/projects?q=...` |
| Click en ProjectCard → board | `GET /api/v1/projects/:id` + `GET /api/v1/projects/:id/tickets` |
| `useKanbanStore.byStatus.todo` etc. | `GET /api/v1/projects/:id/tickets` (frontend agrupa por status) |
| `moveTicket(id, newStatus)` | `POST /api/v1/tickets/:id/lock` → `PATCH /api/v1/tickets/:id/status` → liberación automática del lock |
| Filtros URL del kanban (`?priority=...`) | mismo `GET /api/v1/projects/:id/tickets?priority=...` |
| EmptyBoard "Limpiar filtros" | navegación a la URL sin params (sin call al backend) |
| Btn "Nuevo proyecto" (stub) | `POST /api/v1/projects` |
| Btn "Nuevo ticket" (stub) | `POST /api/v1/projects/:id/tickets` |

---

## 7. Versionado

- `/api/v1` es la baseline. Cualquier breaking change → `/api/v2` paralelo durante transición.
- Cambios aditivos (campos nuevos, endpoints nuevos) NO requieren bump.
- Deprecaciones se anuncian con header `Deprecation: true` y `Sunset: <date>` antes de remover.

---

## 8. Decisiones aprobadas

Confirmadas el 2026-05-06 por el Tech Lead.

| # | Decisión | Implicación |
|---|---|---|
| 1 | **IDs numéricos `int`** | Match con PRD §5 + ER + mock.sql. JSON los expone como números (rango Int seguro <2^53). Frontend migra de `'p1'`/`'u1'`/`'T-112'` → enteros al integrar. |
| 2 | **Tags = catálogo global** | Coherente con `er.md` y `mock.sql`. Cualquier rol Admin (en cualquier proyecto) puede CRUD el catálogo. Si Laura cambia de opinión, requiere migración con FK `project_id` en Tag. |
| 3 | **Catálogo inicial de tags = el del seed** | `bug`, `feature`, `mejora`, `seguridad`, `deuda-técnica` (de `Base-Specs/mock.sql`). Marcos puede agregar más en runtime; no se pre-pueblan adicionales. |
| 4 | **Refresh token rotation single-use** | Cada `POST /auth/refresh` rota. Doble uso del mismo refresh → invalidación de toda la cadena. Mitiga robo silencioso del refresh. |
| 5 | **Header-only auth (Bearer)** | Sin cookies. CSRF no aplica. Frontend guarda tokens en memoria + refresh con `localStorage` (acceptable para herramienta interna; revisitar si se vuelve pública). |
| 6 | **Force unlock (TC-307) = diferido a v1.1** | El timeout automático de 15 min cubre el caso degenerado del MVP. Si el usuario lo pide explícito antes, se evalúa como hotfix. |

Estas decisiones se guardan también en `memory/project_api_contract.md` para sesiones futuras.

---

**Archivo:** `api-contract.md`
**Estado:** **aprobado** v1 — listo para implementar (P0 primero).
