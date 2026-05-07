# Diagramas — Mini Jira

Tres diagramas Mermaid que documentan los flujos críticos del MVP. Mantenidos en
sincronía con el código en `backend/src/modules/auth/` y `backend/src/modules/tickets/`.

---

## 1. Auth con JWT — login + refresh rotation

Login con email/password y rotación single-use del refresh token. El access token
JWT (1h) viaja en `Authorization: Bearer <token>`; el refresh (7d) se persiste como
hash SHA-256 en `refresh_token` para detectar reuso. Si un refresh ya consumido se
intenta usar de nuevo, el backend asume robo y revoca toda la cadena del usuario.

```mermaid
sequenceDiagram
    actor User as Usuario
    participant FE as Frontend (Vite + React 19)
    participant API as Express API (:3030/api/v1)
    participant DB as SQL Server

    %% ── Login ──────────────────────────────────────────────────────────────
    rect rgb(245, 248, 253)
    Note over User,DB: 1. Login inicial
    User->>FE: Email + password
    FE->>API: POST /auth/login<br/>{ email, password }
    API->>DB: SELECT user WHERE email = :email
    alt Usuario no existe
        DB-->>API: null
        API-->>FE: 401 invalid_credentials<br/>(mensaje genérico — no revela existencia)
    else Usuario existe
        DB-->>API: user { id, passwordHash, name }
        API->>API: bcrypt.compare(password, user.passwordHash)
        alt Password no coincide
            API-->>FE: 401 invalid_credentials
        else Password OK
            API->>DB: SELECT projectId, role FROM project_member<br/>WHERE userId = :id
            DB-->>API: [{ projectId, role }]
            API->>API: signAccessToken({sub, email, roles}) — TTL 1h
            API->>API: signRefreshToken(userId, jti) — TTL 7d
            API->>DB: INSERT refresh_token<br/>(userId, tokenHash=sha256(refreshJWT), expiresAt)
            DB-->>API: OK
            API-->>FE: 200 { accessToken, refreshToken,<br/>expiresIn, user, roles }
            FE->>FE: localStorage.setItem('mj.access', accessToken)<br/>localStorage.setItem('mj.refresh', refreshToken)
        end
    end
    end

    %% ── Llamadas autenticadas ──────────────────────────────────────────────
    rect rgb(248, 252, 245)
    Note over User,DB: 2. Llamadas autenticadas
    FE->>API: GET /projects/1/tickets<br/>Authorization: Bearer <accessToken>
    API->>API: verifyAccessToken — valida firma + exp
    API-->>FE: 200 { items, ... }
    end

    %% ── Refresh rotation ───────────────────────────────────────────────────
    rect rgb(253, 248, 240)
    Note over User,DB: 3. Refresh (single-use rotation)
    Note over FE: Access token expirado (~1h)
    FE->>API: POST /auth/refresh<br/>{ refreshToken }
    API->>API: verifyRefreshToken — valida firma + exp
    API->>DB: SELECT * FROM refresh_token<br/>WHERE tokenHash = sha256(refreshJWT)
    alt Token desconocido o revoked
        DB-->>API: null OR revokedAt != null
        API-->>FE: 401 refresh_expired
    else Token ya consumido (REUSO detectado)
        DB-->>API: { consumedAt: <fecha> }
        Note right of API: ¡Posible robo del token!
        API->>DB: UPDATE refresh_token<br/>SET revokedAt = NOW()<br/>WHERE userId = :id AND revokedAt IS NULL
        DB-->>API: OK (toda la cadena del user revocada)
        API-->>FE: 401 refresh_expired<br/>"cadena revocada"
        FE->>FE: clearTokens() → redirect /login
    else Token válido
        DB-->>API: { consumedAt: null, revokedAt: null, expiresAt: <futuro> }
        API->>API: Emitir nuevo access + nuevo refresh
        API->>DB: INSERT refresh_token (nuevo hash)
        API->>DB: UPDATE refresh_token<br/>SET consumedAt = NOW(), replacedById = <newId><br/>WHERE id = <oldId>
        DB-->>API: OK
        API-->>FE: 200 { accessToken, refreshToken, expiresIn }
        FE->>FE: Reemplazar tokens en localStorage
    end
    end

    %% ── Logout ─────────────────────────────────────────────────────────────
    rect rgb(252, 245, 245)
    Note over User,DB: 4. Logout
    User->>FE: Click "Cerrar sesión"
    FE->>API: POST /auth/logout<br/>Authorization: Bearer <accessToken>
    API->>DB: UPDATE refresh_token<br/>SET revokedAt = NOW()<br/>WHERE userId = :id<br/>AND revokedAt IS NULL<br/>AND consumedAt IS NULL
    DB-->>API: OK
    API-->>FE: 204
    FE->>FE: localStorage.removeItem('mj.access' / 'mj.refresh')<br/>redirect /login
    end
```

---

## 2. Mover ticket — Drag-and-drop con AuditLog

El usuario arrastra una card en el Kanban. TanStack Query aplica un **optimistic
update** sobre el cache para que la card se mueva al instante; el `PATCH` real al
backend ejecuta una transacción atómica `INSERT audit_log + UPDATE ticket`.
Si la transacción falla (status fuera de catálogo, ticket archivado, etc.), el
`onError` revierte el cache y la card vuelve a su columna original.

```mermaid
sequenceDiagram
    actor User as Usuario
    participant DnD as @dnd-kit (KanbanBoard)
    participant TQ as TanStack Query (cache)
    participant API as Express API
    participant DB as SQL Server

    %% ── Drag start ─────────────────────────────────────────────────────────
    User->>DnD: Mantiene click + mueve >5px sobre card "T-1"
    DnD->>DnD: useDraggable.onDragStart<br/>setActiveId("1")
    DnD->>DnD: DragOverlay renderiza la card<br/>siguiendo el cursor (opacity 0.4 en origen)

    %% ── Drag over ──────────────────────────────────────────────────────────
    User->>DnD: Hover sobre columna "Listo"
    DnD->>DnD: useDroppable.isOver=true<br/>(background → var(--surface-2))

    %% ── Drop ───────────────────────────────────────────────────────────────
    User->>DnD: Suelta el botón
    DnD->>DnD: onDragEnd<br/>active.id="1", over.id="done"
    DnD->>DnD: Validación: status destino ≠ status origen
    DnD->>TQ: useMoveTicket.mutate({id:"1", newStatus:"done"})

    %% ── Optimistic update ──────────────────────────────────────────────────
    rect rgb(245, 252, 245)
    Note over TQ,API: onMutate — optimistic
    TQ->>TQ: cancelQueries(['tickets', 1])
    TQ->>TQ: prev = getQueryData(['tickets', 1])
    TQ->>TQ: setQueryData → tickets.map(t =><br/>t.id==="1" ? {...t, status:"done"} : t)
    TQ-->>DnD: Card aparece YA en columna "Listo"
    end

    %% ── Llamada al backend ─────────────────────────────────────────────────
    TQ->>API: PATCH /tickets/1/status<br/>Authorization: Bearer <jwt><br/>{ "status": "Listo" }
    API->>API: ensureTicketAccess(userId, 1,<br/>{ allowAssignee: true })
    API->>DB: SELECT t.id, t.projectId, t.status,<br/>t.assignees WHERE userId
    DB-->>API: { id, projectId, status:"Por hacer", assignees:[1] }
    API->>DB: SELECT projectMember<br/>WHERE userId AND projectId
    DB-->>API: { role: "ADMIN" }
    Note over API: Idempotente: si oldStatus===newStatus<br/>NO inserta audit_log ni UPDATE
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT audit_log<br/>{ ticketId, field:"status",<br/>oldValue:"Por hacer", newValue:"Listo",<br/>actorId, timestamp }
    DB-->>API: OK
    API->>DB: UPDATE ticket<br/>SET status="Listo", updated_at=NOW()<br/>WHERE id=1
    DB-->>API: OK
    API->>DB: COMMIT
    DB-->>API: OK
    API-->>TQ: 200 { id, status:"Listo", priority, ... }

    %% ── Settled ────────────────────────────────────────────────────────────
    alt Éxito (200)
        rect rgb(245, 252, 245)
        TQ->>TQ: onSuccess (no-op extra)<br/>onSettled: invalidateQueries(['tickets', 1])
        TQ->>API: GET /projects/1/tickets (refetch)
        API->>DB: SELECT tickets ... WHERE projectId=1
        DB-->>API: 12 tickets (con T-1 ya en "Listo")
        API-->>TQ: 200 { items, ... }
        TQ-->>DnD: Cache sincronizado con BD
        end
    else Error (4xx/5xx)
        rect rgb(252, 245, 245)
        Note over TQ: onError — rollback automático
        TQ->>TQ: setQueryData(['tickets',1], ctx.prev)
        TQ-->>DnD: Card VUELVE a columna "Por hacer"
        TQ->>TQ: onSettled: invalidateQueries (igual)
        end
    end
```

---

## 3. Ciclo de vida del ticket

Las tres columnas del Kanban son los estados activos. Las transiciones son **libres**
(cualquier estado → cualquier otro) — no hay máquina de estados restrictiva.
Sólo el Admin del proyecto puede archivar (soft-delete vía `archived_at`).
Cada cambio de status genera una fila inmutable en `audit_log`.

```mermaid
stateDiagram-v2
    [*] --> Por_hacer : POST /projects/:id/tickets<br/>(default status)

    Por_hacer : Por hacer
    En_progreso : En progreso
    Listo : Listo
    Archivado : Archivado<br/>(archived_at != null)

    Por_hacer --> En_progreso : PATCH /tickets/:id/status<br/>+ INSERT audit_log
    Por_hacer --> Listo : PATCH /tickets/:id/status<br/>+ INSERT audit_log
    En_progreso --> Por_hacer : PATCH + audit
    En_progreso --> Listo : PATCH + audit
    Listo --> Por_hacer : PATCH + audit<br/>(reabrir)
    Listo --> En_progreso : PATCH + audit

    Por_hacer --> Archivado : PATCH /tickets/:id/archive<br/>(solo Admin)
    En_progreso --> Archivado : PATCH /tickets/:id/archive<br/>(solo Admin)
    Listo --> Archivado : PATCH /tickets/:id/archive<br/>(solo Admin)

    Archivado --> [*] : Soft-delete<br/>(NO se borra físicamente)

    note right of Por_hacer
        Status default al crear.
        Cualquier miembro puede crear.
    end note

    note right of Listo
        Cuenta para el dashboard
        de "tickets cerrados/mes".
        Reabrir NO descuenta el cierre
        histórico (HU-14 borde).
    end note

    note right of Archivado
        Idempotente: re-archivar
        actualiza archived_at al
        nuevo timestamp (HU-08 borde).
        Sólo Admin del proyecto.
    end note
```

### Reglas adicionales del ciclo

| Aspecto | Regla |
|---|---|
| Default al crear | `status = 'Por hacer'` (CHECK constraint en BD, schema.prisma) |
| Quién cambia status | Admin del proyecto **o** asignado al ticket (`ensureTicketAccess { allowAssignee: true }`) |
| Quién archiva | Sólo Admin del proyecto (`ensureTicketAccess { adminOnly: true }`) |
| Cambio de status idempotente | Si `oldStatus === newStatus` → no INSERT en audit_log ni UPDATE |
| Auditoría | Cada cambio de status genera fila inmutable: `{field:'status', oldValue, newValue, actorId, timestamp}` |
| Lock pesimista | **Diferido a Phase B** — `PATCH /tickets/:id/status` ya enforce miembro pero aún no requiere lock activo |

---

**Fuentes:**
- `backend/src/modules/auth/service.ts` — flujos `login`, `refresh`, `logout`
- `backend/src/modules/tickets/service.ts` — `changeTicketStatus` (líneas 195-229)
- `frontend/src/features/board/board-hooks.ts` — `useMoveTicket` con optimistic
- `frontend/src/components/board/KanbanBoard.tsx` — DndContext + DragOverlay
- `Base-Specs/specs.md` §2.3 — transiciones libres de status
- `Base-Specs/secuencia.md` — versión Phase B con lock pesimista (referencia)
