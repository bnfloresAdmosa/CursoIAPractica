# Diagrama de Secuencia — Mover ticket de "Por hacer" a "Listo"

```mermaid
sequenceDiagram
    actor Usuario
    participant FE as Frontend (SPA)
    participant API as API Backend
    participant DB as PostgreSQL

    %% ── 1. Abrir ticket en modo edición (adquirir bloqueo) ──────────────
    Usuario->>FE: Hace clic en "Editar" en el ticket

    FE->>API: POST /tickets/:id/lock<br/>(Authorization: Bearer JWT)
    API->>DB: SELECT * FROM TicketLock WHERE ticket_id = :id

    alt Ticket ya bloqueado por otro usuario
        DB-->>API: TicketLock { locked_by: "María", locked_at, expires_at }
        API-->>FE: 409 Conflict { lockedBy: "María", since: "hace 3 min" }
        FE-->>Usuario: Banner "En edición por María — hace 3 minutos"<br/>Formulario deshabilitado
    else Bloqueo expirado o inexistente
        DB-->>API: (sin registro o expires_at vencido)
        API->>DB: UPSERT TicketLock<br/>{ ticket_id, locked_by: userId, locked_at: now, expires_at: now+15min }
        DB-->>API: OK
        API-->>FE: 200 OK { lockAcquired: true, expiresAt }
        FE-->>Usuario: Formulario de edición habilitado
    end

    %% ── 2. Usuario cambia estado y guarda ──────────────────────────────
    Usuario->>FE: Selecciona estado "Listo" y presiona "Guardar"

    FE->>API: PATCH /tickets/:id<br/>{ status: "Listo" }<br/>(Authorization: Bearer JWT)

    %% ── 3. Validaciones en API ─────────────────────────────────────────
    API->>DB: SELECT * FROM TicketLock WHERE ticket_id = :id
    DB-->>API: TicketLock { locked_by: userId, expires_at }

    alt Usuario no posee el bloqueo o expiró
        API-->>FE: 409 Conflict { error: "No tienes el bloqueo activo" }
        FE-->>Usuario: Error "El bloqueo expiró. Recarga e intenta de nuevo."
    else Usuario posee el bloqueo activo
        %% ── 4. Actualizar estado del ticket ────────────────────────────
        API->>DB: UPDATE Ticket<br/>SET status = 'Listo', updated_at = now()<br/>WHERE id = :id
        DB-->>API: OK

        %% ── 5. Escribir registro de auditoría (inmutable) ───────────────
        API->>DB: INSERT INTO AuditLog<br/>{ ticket_id, field: 'status',<br/>  old_value: 'Por hacer',<br/>  new_value: 'Listo',<br/>  actor_id: userId,<br/>  timestamp: now() }
        DB-->>API: OK

        %% ── 6. Liberar bloqueo ─────────────────────────────────────────
        API->>DB: DELETE FROM TicketLock<br/>WHERE ticket_id = :id
        DB-->>API: OK

        %% ── 7. Respuesta al cliente ────────────────────────────────────
        API-->>FE: 200 OK { ticket: { id, status: "Listo", updatedAt } }
        FE-->>Usuario: Ticket actualizado a "Listo"<br/>Formulario cerrado — bloqueo liberado
    end
```

---

## Notas del flujo

| Paso | Regla de negocio aplicada |
|---|---|
| `POST /lock` | El bloqueo expira automáticamente a los 15 min (`LOCK_TIMEOUT_MINUTES`). Un bloqueo vencido se trata como inexistente. |
| `PATCH /tickets/:id` | El API re-valida la propiedad del bloqueo antes de cualquier escritura; no confía en el estado del cliente. |
| `INSERT AuditLog` | El registro es inmutable — no se emite `UPDATE` ni `DELETE` sobre esta tabla. Es la fuente del dashboard de métricas. |
| `DELETE TicketLock` | El bloqueo se libera únicamente al guardar. Si el usuario cancela, el frontend llama a `DELETE /tickets/:id/lock`. |
| Transiciones de estado | Son libres; no hay máquina de estados que restrinja el paso de "Por hacer" a "Listo" directamente. |
