# API Reference — Mini Jira

## Visión general

Backend Express + Prisma + SQL Server. Base URL: `http://localhost:3030/api/v1`. Auth: JWT Bearer header-only (sin cookies). Casing JSON en camelCase, fechas ISO 8601 UTC, status del ticket como literales en español. Envelope: success retorna el recurso directo; errores siempre `{error: {code, message, details?}}`. Documentación interactiva: [`/api/v1/docs`](http://localhost:3030/api/v1/docs) (Swagger UI generado desde Zod).

## Endpoints implementados (P0)

| Método | Ruta | Auth | Body resumen | Response 2xx | Errores principales |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | público | `{email, password}` | `200` `{accessToken, refreshToken, expiresIn, user, roles}` | `401 invalid_credentials`, `422 validation_error` |
| `POST` | `/auth/refresh` | público | `{refreshToken}` | `200` `{accessToken, refreshToken, expiresIn}` | `401 refresh_expired` |
| `POST` | `/auth/logout` | Bearer | — | `204` (sin body) | `401 unauthorized` |
| `GET` | `/projects` | Bearer | query `archived,q,cursor,limit` | `200` `{items, nextCursor, hasMore}` | `401 unauthorized` |
| `GET` | `/projects/{projectId}` | Bearer + miembro | — | `200` `Project` | `403 forbidden_member`, `404 not_found` |
| `POST` | `/projects` | Bearer | `{name, description?}` | `201` `Project` | `422 validation_error` |
| `PATCH` | `/projects/{projectId}` | Bearer + Admin proyecto | `{name?, description?}` | `200` `Project` | `403 forbidden_role`, `422 validation_error` |
| `PATCH` | `/projects/{projectId}/archive` | Bearer + Admin proyecto | — | `200` `{id, archivedAt}` | `403 forbidden_role` |
| `GET` | `/projects/{projectId}/tickets` | Bearer + miembro | query `status,priority,tag,assignee,q,archived,cursor,limit` | `200` `{items, nextCursor, hasMore}` | `403 forbidden_member`, `422 validation_error` |
| `POST` | `/projects/{projectId}/tickets` | Bearer + miembro | `{title, description?, priorityId, status?, assigneeIds?, tagIds?}` | `201` `Ticket` | `403 forbidden_member`, `422 validation_error` |
| `GET` | `/tickets/{ticketId}` | Bearer + miembro | — | `200` `Ticket` | `403 forbidden_member`, `404 not_found` |
| `PATCH` | `/tickets/{ticketId}/status` | Bearer + (Admin proyecto **o** asignado) | `{status: "Por hacer"\|"En progreso"\|"Listo"}` | `200` `Ticket` (con audit log generado en transacción) | `403 forbidden_role`, `404 not_found`, `422 validation_error` |
| `PATCH` | `/tickets/{ticketId}/archive` | Bearer + Admin proyecto | — | `200` `{id, archivedAt}` | `403 forbidden_role`, `404 not_found` |

> Endpoints P1/P2 (locks, comments, assignees, tags CRUD, project members, dashboard, audit log read, search) están definidos en `api-contract.md` pero **no están implementados todavía**. Esta referencia sólo cubre lo que el código entrega hoy.

---

## Auth

### `POST /auth/login`

Emite `accessToken` (TTL 1h) + `refreshToken` (TTL 7d) más el mapa de roles por proyecto. Mensaje de error genérico — no revela si el email existe (HU-01 borde).

```bash
curl -X POST http://localhost:3030/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "laura@empresa.com",
    "password": "demo123"
  }'
```

**Respuesta 200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "name": "Laura Méndez",
    "email": "laura@empresa.com"
  },
  "roles": { "1": "ADMIN" }
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `401` | `invalid_credentials` | Email no existe **o** password incorrecto (mismo mensaje en ambos casos) |
| `422` | `validation_error` | `email` con formato inválido o `password` vacío |

---

### `POST /auth/refresh`

Rota el refresh token con política **single-use**: el token entrante se marca `consumed_at` y se emite uno nuevo. Si el mismo refresh se reusa → `401 refresh_expired` y se invalida toda la cadena del usuario.

```bash
curl -X POST http://localhost:3030/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Respuesta 200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `401` | `refresh_expired` | Token vencido, revocado, reusado o desconocido |
| `422` | `validation_error` | Body sin `refreshToken` |

---

### `POST /auth/logout`

Revoca todos los refresh tokens vigentes del usuario (set `revoked_at`). El access token caduca solo por TTL — el cliente debe descartarlo.

```bash
curl -X POST http://localhost:3030/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta 204** — sin body.

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `401` | `unauthorized` | Sin `Authorization: Bearer ...` o token expirado |

---

## Projects

### `GET /projects`

Lista proyectos donde el usuario es miembro, con aggregates server-side (`memberCount`, `openTicketCount`, `lastActivityAt`). Paginación cursor-based.

```bash
curl "http://localhost:3030/api/v1/projects?archived=false&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Query params**

| Param | Default | Notas |
|---|---|---|
| `archived` | `false` | `true` lista solo archivados |
| `q` | — | búsqueda case-insensitive en `name` |
| `cursor` | — | token opaco de paginación |
| `limit` | `20` | min 1, max 100 |

**Respuesta 200**

```json
{
  "items": [
    {
      "id": 1,
      "name": "Rediseño Web",
      "description": "Renovación visual y de UX del sitio corporativo.",
      "archivedAt": null,
      "createdBy": 1,
      "createdAt": "2026-04-01T09:00:00.000Z",
      "myRole": "ADMIN",
      "memberCount": 7,
      "openTicketCount": 12,
      "lastActivityAt": "2026-05-06T22:50:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `401` | `unauthorized` | Sin Bearer válido |
| `422` | `validation_error` | `limit` fuera de rango |

---

### `GET /projects/{projectId}`

Detalle de un proyecto. Sólo si el usuario es miembro — sin leak de proyectos ajenos.

```bash
curl http://localhost:3030/api/v1/projects/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta 200**

```json
{
  "id": 1,
  "name": "Rediseño Web",
  "description": "Renovación visual y de UX del sitio corporativo.",
  "archivedAt": null,
  "createdBy": 1,
  "createdAt": "2026-04-01T09:00:00.000Z",
  "myRole": "ADMIN",
  "memberCount": 7,
  "openTicketCount": 12,
  "lastActivityAt": null
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `projectId` no numérico |
| `403` | `forbidden_member` | Usuario no es miembro |
| `404` | `not_found` | Proyecto no existe |

---

### `POST /projects`

Crea un proyecto. El creador queda automáticamente como `ADMIN` en una transacción atómica (`project` + `project_member`).

```bash
curl -X POST http://localhost:3030/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Migración API v2",
    "description": "Migrar endpoints legacy a v2"
  }'
```

**Respuesta 201**

```json
{
  "id": 6,
  "name": "Migración API v2",
  "description": "Migrar endpoints legacy a v2",
  "archivedAt": null,
  "createdBy": 1,
  "createdAt": "2026-05-07T10:00:00.000Z",
  "myRole": "ADMIN",
  "memberCount": 1,
  "openTicketCount": 0,
  "lastActivityAt": null
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `422` | `validation_error` | `name` vacío o > 255 chars |

> Los nombres **NO** son únicos globalmente (HU-03 borde) — dos equipos pueden tener "Rediseño Web".

---

### `PATCH /projects/{projectId}`

Edita campos básicos. Solo Admin del proyecto.

```bash
curl -X PATCH http://localhost:3030/api/v1/projects/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rediseño Web 2.0",
    "description": "Fase 2 del rediseño"
  }'
```

**Respuesta 200** — devuelve el proyecto completo (mismo shape que `GET /projects/{id}`).

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `projectId` no numérico |
| `403` | `forbidden_member` | No es miembro |
| `403` | `forbidden_role` | Es miembro pero no Admin |
| `422` | `validation_error` | `name` > 255 chars |

---

### `PATCH /projects/{projectId}/archive`

Soft delete idempotente. Solo Admin. Re-archivar actualiza el timestamp (HU-04 borde).

```bash
curl -X PATCH http://localhost:3030/api/v1/projects/1/archive \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta 200**

```json
{ "id": 1, "archivedAt": "2026-05-07T10:00:00.000Z" }
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `projectId` no numérico |
| `403` | `forbidden_role` | Usuario regular intenta archivar |

---

## Tickets

### `GET /projects/{projectId}/tickets`

Lista tickets del proyecto con filtros combinables (AND entre keys, OR dentro de la misma key). Paginación cursor.

```bash
curl "http://localhost:3030/api/v1/projects/1/tickets?status=Por%20hacer,En%20progreso&priority=Alta&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Query params**

| Param | Tipo | Notas |
|---|---|---|
| `status` | comma-list | `"Por hacer,En progreso,Listo"` |
| `priority` | comma-list | `"Alta,Media,Baja"` (nombres) |
| `tag` | comma-list ints | tag ids |
| `assignee` | comma-list ints | user ids |
| `q` | string | substring case-insensitive en `title` |
| `archived` | bool | default `false` |
| `cursor` | string | opaco |
| `limit` | int | min 1, max 100, default 20 |

**Respuesta 200**

```json
{
  "items": [
    {
      "id": 1,
      "title": "Rediseñar la página de inicio con nueva hero",
      "description": null,
      "status": "En progreso",
      "priority": { "id": 1, "name": "Alta", "order": 1 },
      "projectId": 1,
      "createdBy": 1,
      "archivedAt": null,
      "createdAt": "2026-05-06T22:50:00.000Z",
      "updatedAt": "2026-05-06T22:50:00.000Z",
      "assignees": [
        { "id": 1, "name": "Laura Méndez" },
        { "id": 2, "name": "Carlos Rivas" }
      ],
      "tags": [
        { "id": 2, "name": "feature", "color": "#0071e3" },
        { "id": 4, "name": "diseño", "color": "#3d8b7a" }
      ],
      "commentCount": 0,
      "lock": null
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `projectId` no numérico |
| `403` | `forbidden_member` | No es miembro del proyecto |
| `422` | `validation_error` | `limit` fuera de rango |

---

### `POST /projects/{projectId}/tickets`

Cualquier miembro del proyecto puede crear. `createdBy` se setea desde el JWT (no del body — EC-MVP-02).

```bash
curl -X POST http://localhost:3030/api/v1/projects/1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Corregir error 500 en /auth/refresh",
    "description": "El endpoint devuelve 500 cuando el refresh token expirado tiene formato válido. Debería ser 401.",
    "priorityId": 1,
    "status": "Por hacer",
    "assigneeIds": [2],
    "tagIds": [1, 7]
  }'
```

**Respuesta 201** — ticket completo (mismo shape que el listado, con `description` siempre presente).

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `projectId` no numérico |
| `403` | `forbidden_member` | No es miembro |
| `422` | `validation_error` | `title` vacío o > 255, `priorityId` ausente, `assigneeIds` con users que no son miembros (HU-09 borde — `details: {assigneeIds: "..."}`) |

---

### `GET /tickets/{ticketId}`

Detalle del ticket. Verifica membership del proyecto del ticket — ningún leak cross-project.

```bash
curl http://localhost:3030/api/v1/tickets/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta 200** — mismo shape que un ítem de `GET /projects/{id}/tickets`.

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `ticketId` no numérico |
| `403` | `forbidden_member` | No es miembro del proyecto del ticket |
| `404` | `not_found` | Ticket no existe |

---

### `PATCH /tickets/{ticketId}/status`

Cambia el estado del ticket. Permitido a Admin del proyecto **o** usuarios asignados al ticket. Genera fila en `audit_log` en la **misma transacción** que el `UPDATE` (si el log falla, el cambio se revierte). Idempotente: si el nuevo status es igual al actual, no se inserta audit log y no se actualiza `updated_at`.

```bash
curl -X PATCH http://localhost:3030/api/v1/tickets/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Listo"
  }'
```

**Respuesta 200** — ticket completo con el nuevo `status` y `updatedAt` actualizado.

```json
{
  "id": 1,
  "title": "Rediseñar la página de inicio con nueva hero",
  "status": "Listo",
  "priority": { "id": 1, "name": "Alta", "order": 1 },
  "projectId": 1,
  "createdBy": 1,
  "updatedAt": "2026-05-07T11:30:00.000Z",
  "assignees": [{ "id": 1, "name": "Laura Méndez" }],
  "tags": [],
  "commentCount": 0,
  "lock": null
}
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `ticketId` no numérico |
| `403` | `forbidden_role` | Usuario no es Admin ni asignado al ticket |
| `403` | `forbidden_member` | No pertenece al proyecto |
| `404` | `not_found` | Ticket no existe |
| `422` | `validation_error` | `status` fuera del catálogo (`"Por hacer"`, `"En progreso"`, `"Listo"`) |

> **Nota:** la regla "requiere lock activo" de `api-contract.md §2.3` está **diferida a Phase B**. Por ahora cualquier asignado/Admin puede cambiar el status sin lock previo.

---

### `PATCH /tickets/{ticketId}/archive`

Soft delete idempotente. Solo Admin del proyecto. El `audit_log` del ticket queda intacto.

```bash
curl -X PATCH http://localhost:3030/api/v1/tickets/1/archive \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta 200**

```json
{ "id": 1, "archivedAt": "2026-05-07T11:45:00.000Z" }
```

**Errores**

| Código | `code` | Cuándo |
|---|---|---|
| `400` | `bad_request` | `ticketId` no numérico |
| `403` | `forbidden_role` | Usuario regular intenta archivar (HU-08 borde) |
| `403` | `forbidden_member` | No es miembro del proyecto |
| `404` | `not_found` | Ticket no existe |

---

## Envelope de errores

Todos los errores respetan el shape `{error: {code, message, details?}}`. Ejemplos reales:

### `401 unauthorized` — sin Bearer

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Auth requerido"
  }
}
```

### `401 invalid_credentials` — login fallido (mensaje genérico)

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Credenciales inválidas"
  }
}
```

> Idéntico mensaje cuando el email no existe **y** cuando el password está mal. Mitiga enumeración de usuarios.

### `403 forbidden_member`

```json
{
  "error": {
    "code": "forbidden_member",
    "message": "No eres miembro de este proyecto"
  }
}
```

### `403 forbidden_role`

```json
{
  "error": {
    "code": "forbidden_role",
    "message": "Rol insuficiente"
  }
}
```

### `404 not_found`

```json
{
  "error": {
    "code": "not_found",
    "message": "Ticket no encontrado"
  }
}
```

### `409 ticket_locked` — lock activo de otro usuario *(reservado para Phase B)*

```json
{
  "error": {
    "code": "ticket_locked",
    "message": "En edición por Carlos Rivas",
    "details": {
      "lockedBy": { "id": 2, "name": "Carlos Rivas" },
      "lockedAt": "2026-05-07T11:00:00.000Z",
      "expiresAt": "2026-05-07T11:15:00.000Z"
    }
  }
}
```

### `422 validation_error` — campo inválido

```json
{
  "error": {
    "code": "validation_error",
    "message": "Datos inválidos",
    "details": {
      "title": ["String must contain at least 1 character(s)"],
      "priorityId": ["Required"]
    }
  }
}
```

`details` mapea cada campo del body a un array de mensajes. Generado por `flatten().fieldErrors` de Zod.

---

## Convenciones rápidas (recordatorio)

- **Auth:** `Authorization: Bearer <accessToken>` en todo lo no público.
- **Casing:** JSON camelCase, BD snake_case (Prisma maneja la conversión).
- **IDs:** enteros (`1`, `2`, ...). Nunca strings tipo `"T-112"`.
- **Fechas:** ISO 8601 UTC (`"2026-05-07T11:00:00.000Z"`).
- **Status del ticket:** literales en español (`"Por hacer"`, `"En progreso"`, `"Listo"`).
- **Soft delete:** nunca `DELETE` físico — `archivedAt`/`deletedAt` siempre.

Spec canónica: [`api-contract.md`](../api-contract.md) (raíz del repo).
