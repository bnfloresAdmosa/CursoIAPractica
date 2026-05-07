# Plan de Pruebas — Mini Jira MVP

**Versión:** 1.0  
**Fecha:** 21 de Abril 2026  
**QA Lead:** (a asignar)  
**Basado en:** `backlog.md` v1.0  
**Ambiente objetivo:** Staging (Docker Compose local + CI pipeline)

---

## 1. Alcance

| Incluido | Excluido |
|---|---|
| Autenticación JWT y control de roles | Modo oscuro (out of scope MVP) |
| CRUD completo de tickets | Notificaciones en tiempo real (WebSockets) |
| Bloqueo pesimista y concurrencia | Exportación de datos |
| Log de auditoría inmutable | Integraciones externas |
| Soft delete en tickets y proyectos | Superadmin global |
| Edge cases definidos en backlog | Bulk assign |

---

## 2. Estrategia de Pruebas

```
Pirámide de testing adoptada:

        [E2E — Playwright]        ← Flujos críticos de usuario (5–8 escenarios)
      [Integración — Supertest]   ← Contratos de API + BD real (no mocks)
    [Unitarias — Vitest]          ← Lógica de dominio y validaciones puras
```

**Principio rector:** Las pruebas de integración usan PostgreSQL real (Docker).  
No se mockea la base de datos — lección aprendida de incidentes previos con migraciones.

---

## 3. Casos de Prueba por Historia

---

### HU-1 — Autenticación y Control de Acceso por Rol

#### TC-101 — Login exitoso emite tokens válidos
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Inicio de sesión exitoso con credenciales válidas`
- **Precondición:** Usuario `carlos@empresa.com` existe en BD con contraseña hasheada.
- **Pasos:**
  1. `POST /auth/login` con `{ email, password }` correctos.
  2. Verificar respuesta HTTP 200.
  3. Decodificar JWT y validar presencia de `user_id` y mapa de roles.
  4. Verificar que `refresh_token` está presente y tiene TTL de 7 días.
- **Resultado esperado:** `access_token` válido + `refresh_token` válido, sin datos sensibles expuestos.

#### TC-102 — Login fallido con contraseña incorrecta
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Acceso denegado con contraseña incorrecta`
- **Pasos:**
  1. `POST /auth/login` con contraseña errónea.
  2. Verificar respuesta HTTP 401.
  3. Verificar que el body no contiene tokens ni datos del usuario.
- **Resultado esperado:** Error 401, cuerpo genérico sin revelar si el email existe.

#### TC-103 — Admin archiva ticket en su proyecto
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Admin del proyecto puede archivar un ticket`
- **Precondición:** Usuario con rol `ADMIN` en proyecto `P1`; ticket `T1` activo en `P1`.
- **Pasos:**
  1. Autenticar como Admin.
  2. `PATCH /tickets/T1/archive`.
  3. Consultar `GET /tickets/T1` sin filtro archivados.
- **Resultado esperado:** `archived_at` != null; ticket ausente en vista activa.

#### TC-104 — Usuario regular no puede archivar ticket
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Usuario regular no puede archivar un ticket`
- **Pasos:**
  1. Autenticar como Usuario (rol `USER`) en `P1`.
  2. `PATCH /tickets/T1/archive`.
- **Resultado esperado:** HTTP 403; `archived_at` permanece null en BD.

#### TC-105 — Roles distintos en proyectos distintos para el mismo usuario
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Un mismo usuario opera con roles distintos`
- **Pasos:**
  1. Crear usuario Ana con `ADMIN` en `P1` y `USER` en `P2`.
  2. Autenticar como Ana.
  3. Intentar archivar ticket en `P2` → esperar 403.
  4. Archivar ticket en `P1` → esperar 200.
- **Resultado esperado:** Autorización correcta por proyecto, no global.

#### TC-106 (Edge Case) — Refresh token expirado
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Edge Case 1 — HU-1`
- **Pasos:**
  1. Generar refresh token con `expires_at = now - 1h` directamente en BD.
  2. `POST /auth/refresh` con ese token.
- **Resultado esperado:** HTTP 401; no se emite nuevo token.

#### TC-107 (Edge Case) — JWT válido sin pertenencia al proyecto
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Edge Case 2 — HU-1`
- **Pasos:**
  1. Autenticar usuario sin `ProjectMember` en proyecto `P_secreto`.
  2. `GET /projects/P_secreto/tickets`.
- **Resultado esperado:** HTTP 403; body sin datos del proyecto.

---

### HU-2 — Ciclo de Vida Completo de un Ticket

#### TC-201 — Crear ticket con campos obligatorios
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Creación exitosa de un ticket`
- **Pasos:**
  1. `POST /projects/P1/tickets` con `{ title, status, priority }` válidos.
  2. Verificar HTTP 201.
  3. Verificar `created_by` == usuario autenticado.
  4. Verificar `created_at` en UTC.
- **Resultado esperado:** Ticket persistido con metadatos correctos.

#### TC-202 — Crear ticket sin título retorna error de validación
- **Tipo:** Unitaria + Integración
- **Criterio Gherkin:** `Scenario: No se puede crear un ticket sin título`
- **Pasos:**
  1. Unitaria: validar que el schema rechaza `title: null | ""`.
  2. Integración: `POST /projects/P1/tickets` con body sin `title`.
- **Resultado esperado:** HTTP 422 con detalle del campo inválido; 0 registros insertados.

#### TC-203 — Cambio de estado genera auditoría inmutable
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Scenario: Cambio de estado genera registro de auditoría`
- **Pasos:**
  1. Crear ticket en estado `Por hacer`.
  2. `PATCH /tickets/T1/status` con `{ status: "En progreso" }`.
  3. Consultar tabla `AuditLog` directamente.
  4. Intentar `DELETE` o `UPDATE` sobre ese registro de auditoría.
- **Resultado esperado:** Registro con `campo=status`, `old_value=Por hacer`, `new_value=En progreso`. El intento de modificación debe ser bloqueado (constraint o permiso de BD).

#### TC-204 — Solo Admin puede asignar usuarios a un ticket
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Solo el Admin puede asignar o reasignar usuarios`
- **Pasos:**
  1. Autenticar como Admin; `PATCH /tickets/T1/assignees` con `[userId_Maria, userId_Jorge]`.
  2. Verificar que ambos aparecen en `TicketAssignee`.
  3. Repetir como Usuario regular → esperar 403.
- **Resultado esperado:** Asignación correcta solo para Admin; notificación email encolada para María y Jorge.

#### TC-205 — Archivar ticket es soft delete
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Scenario: Archivar un ticket no lo elimina físicamente`
- **Pasos:**
  1. Admin archiva ticket `T1`.
  2. `SELECT * FROM "Ticket" WHERE id = T1` directamente en BD.
  3. `GET /projects/P1/tickets` (sin filtro archivados).
  4. `GET /projects/P1/tickets?archived=true`.
- **Resultado esperado:** Fila existe en BD con `archived_at` != null; ausente en vista activa; presente con filtro explícito.

#### TC-206 (Edge Case) — Título en límite exacto de 255 caracteres
- **Tipo:** Unitaria + Integración
- **Criterio Gherkin:** `Edge Case 1 — HU-2`
- **Pasos:**
  1. Crear ticket con título de 255 chars → esperar 201.
  2. Crear ticket con título de 256 chars → esperar 422.
- **Resultado esperado:** Boundary exacto: 255 pasa, 256 falla.

#### TC-207 (Edge Case) — Carrera en cambio de estado sin bloqueo
- **Tipo:** Integración (concurrencia)
- **Criterio Gherkin:** `Edge Case 2 — HU-2`
- **Pasos:**
  1. Ticket `T1` en estado `Por hacer`, sin bloqueo activo.
  2. Carlos adquiere bloqueo y cambia estado a `En progreso`.
  3. Simultáneamente, María intenta `PATCH /tickets/T1/status` sin haber adquirido bloqueo.
- **Resultado esperado:** Solicitud de María retorna HTTP 409 (conflict); estado final = `En progreso`; `AuditLog` tiene una sola entrada.

---

### HU-3 — Bloqueo Pesimista para Edición Concurrente

#### TC-301 — Primer editor adquiere bloqueo
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Scenario: El primer editor adquiere el bloqueo`
- **Pasos:**
  1. `POST /tickets/T1/lock` como Carlos.
  2. Verificar HTTP 200.
  3. Consultar `TicketLock`: `locked_by=Carlos.id`, `expires_at = now + 15min`.
- **Resultado esperado:** Registro de bloqueo creado con TTL correcto.

#### TC-302 — Segundo usuario ve banner de bloqueo
- **Tipo:** E2E (Playwright)
- **Criterio Gherkin:** `Scenario: Segundo usuario ve el bloqueo activo`
- **Pasos:**
  1. Carlos abre ticket en modo edición (sesión A).
  2. María abre el mismo ticket en modo edición (sesión B).
  3. Verificar visibilidad del banner con texto `"En edición por Carlos"`.
  4. Verificar que el formulario de edición tiene `disabled=true`.
- **Resultado esperado:** Banner visible; formulario inaccesible para María.

#### TC-303 — Bloqueo se libera al guardar
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Scenario: El bloqueo se libera al guardar cambios`
- **Pasos:**
  1. Carlos adquiere bloqueo sobre `T1`.
  2. Carlos guarda cambios: `PUT /tickets/T1` con payload válido.
  3. Consultar `TicketLock` para `T1`.
  4. María intenta adquirir bloqueo.
- **Resultado esperado:** `TicketLock` eliminado tras el save; María obtiene bloqueo exitosamente.

#### TC-304 — Bloqueo expira por inactividad (timeout)
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Scenario: El bloqueo expira automáticamente por inactividad`
- **Pasos:**
  1. Insertar en `TicketLock` un registro con `expires_at = now - 1min` (bloqueo vencido).
  2. María intenta `POST /tickets/T1/lock`.
- **Resultado esperado:** Sistema detecta expiración, elimina el lock stale, otorga bloqueo a María. HTTP 200.

#### TC-305 — Comentarios ignoran el bloqueo
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Scenario: Los comentarios no requieren ni respetan el bloqueo`
- **Pasos:**
  1. Carlos tiene bloqueo activo sobre `T1`.
  2. María `POST /tickets/T1/comments` con body válido.
  3. Verificar HTTP 201 y persistencia del comentario.
  4. Verificar que `TicketLock` de Carlos no cambió.
- **Resultado esperado:** Comentario creado; bloqueo intacto.

#### TC-306 (Edge Case) — Lock huérfano por cierre abrupto de navegador
- **Tipo:** Integración (API)
- **Criterio Gherkin:** `Edge Case 1 — HU-3`
- **Pasos:**
  1. Carlos adquiere bloqueo. No llama al endpoint de liberación.
  2. Simular tiempo: actualizar `expires_at = now - 1s` en BD.
  3. María intenta adquirir bloqueo.
- **Resultado esperado:** Sistema libera lock expirado automáticamente; María obtiene bloqueo. No requiere intervención manual.

#### TC-307 (Edge Case) — Admin fuerza desbloqueo de ticket bloqueado por Usuario
- **Tipo:** Integración (API + BD)
- **Criterio Gherkin:** `Edge Case 2 — HU-3`
- **Pasos:**
  1. María (rol Usuario) tiene bloqueo activo sobre `T1`.
  2. Admin llama `DELETE /tickets/T1/lock?force=true`.
  3. Verificar HTTP 200.
  4. Verificar registro en `AuditLog` con `actor=Admin`, `action=force_unlock`.
  5. Admin adquiere bloqueo sobre `T1`.
- **Resultado esperado:** Bloqueo liberado; auditoría registrada; Admin puede editar.

---

## 4. Matriz de Cobertura

| ID | Historia | Tipo | Prioridad | Criterio Gherkin cubierto |
|---|---|---|---|---|
| TC-101 | HU-1 | Integración | Alta | Login exitoso |
| TC-102 | HU-1 | Integración | Alta | Login fallido |
| TC-103 | HU-1 | Integración | Alta | Admin archiva ticket |
| TC-104 | HU-1 | Integración | Alta | Usuario no puede archivar |
| TC-105 | HU-1 | Integración | Alta | Roles distintos por proyecto |
| TC-106 | HU-1 | Integración | Media | Refresh token expirado |
| TC-107 | HU-1 | Integración | Media | JWT sin pertenencia al proyecto |
| TC-201 | HU-2 | Integración | Alta | Crear ticket válido |
| TC-202 | HU-2 | Unitaria + Integración | Alta | Crear ticket sin título |
| TC-203 | HU-2 | Integración | Alta | Auditoría inmutable |
| TC-204 | HU-2 | Integración | Alta | Solo Admin asigna |
| TC-205 | HU-2 | Integración | Alta | Soft delete verificado en BD |
| TC-206 | HU-2 | Unitaria + Integración | Media | Boundary 255 chars |
| TC-207 | HU-2 | Integración | Alta | Race condition en estado |
| TC-301 | HU-3 | Integración | Alta | Adquirir bloqueo |
| TC-302 | HU-3 | E2E | Alta | Banner de bloqueo en UI |
| TC-303 | HU-3 | Integración | Alta | Liberar bloqueo al guardar |
| TC-304 | HU-3 | Integración | Alta | Expiración de bloqueo |
| TC-305 | HU-3 | Integración | Alta | Comentarios ignoran bloqueo |
| TC-306 | HU-3 | Integración | Alta | Lock huérfano por crash |
| TC-307 | HU-3 | Integración | Media | Admin force unlock + auditoría |

**Total: 21 casos de prueba** — 17 de alta prioridad, 4 de media.

---

## 5. Ambientes y Datos de Prueba

### Ambientes
| Ambiente | Propósito | BD |
|---|---|---|
| Local (Docker Compose) | Desarrollo diario y unitarias | PostgreSQL contenedor |
| CI (GitHub Actions) | Integración en cada PR | PostgreSQL servicio efímero |
| Staging | QA sign-off antes de release | PostgreSQL staging aislado |

### Datos de prueba requeridos (seed)
```
Usuarios:
  - admin@test.com   / rol ADMIN  en Proyecto P1
  - user@test.com    / rol USER   en Proyecto P1
  - ana@test.com     / rol ADMIN en P1, USER en P2
  - maria@test.com   / rol USER   en Proyecto P1
  - carlos@test.com  / rol USER   en Proyecto P1

Proyectos:
  - P1: "Plataforma Core" (activo)
  - P2: "Proyecto Secreto" (activo, sin membresía de usuario de prueba general)

Tickets:
  - T1: "Bug en login", estado=Por hacer, proyecto=P1, sin bloqueo
```

---

## 6. Criterios de Entrada y Salida

### Criterios de entrada (para iniciar ciclo de QA)
- [ ] Migraciones de Prisma aplicadas sin errores en staging.
- [ ] Seed de datos de prueba ejecutado exitosamente.
- [ ] Build de CI verde en la rama a probar.
- [ ] Variables de entorno configuradas: `JWT_SECRET`, `LOCK_TIMEOUT_MINUTES`, `DATABASE_URL`.

### Criterios de salida (para aprobar release)
- [ ] 100% de casos de prioridad Alta ejecutados y aprobados.
- [ ] 0 bugs críticos o bloqueantes abiertos.
- [ ] TC-207 y TC-306 (concurrencia) ejecutados con logs de BD validados.
- [ ] TC-302 (E2E banner) aprobado en Chrome y Firefox.
- [ ] Revisión de `AuditLog`: confirmar inmutabilidad con intento de UPDATE directo en BD.

---

## 7. Riesgos de QA

| Riesgo | Impacto | Mitigación |
|---|---|---|
| TC-207 es no determinista en CI (race condition) | Alto | Usar transacciones con `SELECT FOR UPDATE` en la implementación; el test debe ser repetible |
| TC-307 (force unlock) no está en el PRD original | Medio | Requiere validación del PO (Laura) antes de implementar y probar |
| Timeout de 15 min difícil de probar en CI sin manipulación de tiempo | Medio | Exponer `LOCK_TIMEOUT_MINUTES=1` en ambiente de test; usar `expires_at` manipulado en BD para TC-304 y TC-306 |
| Auditoría inmutable: depende de permisos de BD, no solo de la app | Alto | Verificar con usuario de BD restringido que no puede `UPDATE`/`DELETE` en `AuditLog` |

---

## 8. Decisión Pendiente que Bloquea Testing

> **TC-307 (Admin force unlock)** no puede finalizarse hasta que el PO confirme si el Admin tiene esa capacidad.  
> Registrado como decisión pendiente — alinear con Laura antes del lunes.

---

## 9. Edge Cases Críticos que Pueden Romper el MVP

### Metodología de priorización

Cada edge case se evalúa con dos dimensiones:

- **Probabilidad** (P): Qué tan probable es que ocurra en producción con ~10 usuarios.  `1=Raro` `2=Posible` `3=Probable`
- **Impacto** (I): Consecuencia si ocurre. `1=Menor` `2=Degradación` `3=Pérdida de datos / sistema inoperante`
- **Score de riesgo** = P × I (máximo 9)

```
Umbral de acción:
  7–9  → CRÍTICO  — bloquea el release si no está cubierto
  4–6  → ALTO     — debe resolverse antes del release
  1–3  → MEDIO    — mitigar en v1.1
```

---

### EC-MVP-01 — Falla de red durante la adquisición del bloqueo

**Categoría:** Falla de red + estado inconsistente  
**Historia afectada:** HU-3 — Bloqueo Pesimista

#### Descripción del riesgo

El cliente envía `POST /tickets/T1/lock`. El servidor persiste el registro en `TicketLock` (bloqueo activo) pero la respuesta HTTP nunca llega al cliente por un corte de red. El cliente interpreta el silencio como un fallo y no muestra al usuario que tiene el bloqueo. El usuario intenta editar desde una pantalla de "solo lectura". Mientras tanto, la BD tiene el ticket bloqueado a su nombre — nadie más puede editarlo durante 15 minutos y el dueño real del lock no lo sabe.

**Consecuencia:** El ticket queda congelado para todo el equipo sin que nadie pueda identificar la causa. Ningún log de aplicación indica el problema porque la operación fue exitosa en BD.

#### Matriz de riesgo

| Dimensión | Valor | Justificación |
|---|---|---|
| Probabilidad (P) | 3 | Conexiones móviles / VPN corporativa inestables; timeout de red en CI cloud |
| Impacto (I) | 3 | Ticket bloqueado sin editor funcional; equipo de 10 bloqueado hasta timeout |
| **Score** | **9 — CRÍTICO** | Pérdida de disponibilidad operativa hasta que expire el TTL |

#### Caso de prueba

```gherkin
  Scenario: Falla de red después de persistir el bloqueo pero antes de responder al cliente
    Given el ticket T1 no tiene bloqueo activo
    When Carlos envía POST /tickets/T1/lock
    And la conexión se corta antes de que el cliente reciba la respuesta HTTP
    Then TicketLock en BD tiene locked_by=Carlos con expires_at válido
    And Carlos no recibe confirmación visual de que tiene el bloqueo
    When Carlos intenta editar el ticket desde la UI (sin saber que tiene el bloqueo)
    Then el sistema detecta que Carlos ya posee el bloqueo activo
    And la UI muestra el formulario en modo edición sin adquirir un segundo lock
    And el registro de TicketLock original permanece sin duplicados
```

#### Mitigación requerida en implementación

- El endpoint `POST /tickets/lock` debe ser **idempotente**: si el solicitante ya tiene el bloqueo, retorna 200 con el lock existente en lugar de error.
- El cliente debe re-intentar la adquisición al detectar timeout (con `retry: 1`).
- Verificar con `GET /tickets/T1/lock` al montar la vista de edición para reconciliar estado.

---

### EC-MVP-02 — Concurrencia extrema: N usuarios crean tickets simultáneamente con `created_by` nulo

**Categoría:** Entradas nulas + concurrencia en escritura  
**Historia afectada:** HU-2 — Ciclo de vida del ticket + HU-1 — Autenticación

#### Descripción del riesgo

Bajo carga concurrente, el middleware de autenticación extrae `user_id` del JWT y lo adjunta al objeto `request`. Si hay un bug de timing en el middleware (p. ej., el middleware asíncrono resuelve después de que el handler ya ejecutó) o el token caduca justo entre la validación y la escritura, el campo `created_by` llega como `null` al ORM. Prisma insertaría un ticket con `created_by = NULL` si la columna no tiene `NOT NULL` enforced a nivel de BD. El ticket huérfano contamina el `AuditLog` con `actor_id = null` y rompe el cálculo de métricas del dashboard.

**Consecuencia:** Tickets sin propietario en BD; el dashboard de métricas no puede atribuir cierres a usuarios; `AuditLog` con `actor_id=null` genera errores en queries de reporting. En peores casos, si el FK no tiene constraint, el dato corrupto se propaga silenciosamente.

#### Matriz de riesgo

| Dimensión | Valor | Justificación |
|---|---|---|
| Probabilidad (P) | 2 | El equipo es pequeño (~10 personas) pero el bug puede aparecer en deploy inicial o pruebas de carga |
| Impacto (I) | 3 | Corrupción silenciosa del AuditLog; dashboard de métricas inoperante; difícil de detectar post-facto |
| **Score** | **6 — ALTO** | No bloquea operación inmediata pero destruye la integridad histórica del log |

#### Caso de prueba

```gherkin
  Scenario: Múltiples usuarios crean tickets simultáneamente — verificar integridad de created_by
    Given 5 usuarios autenticados con tokens válidos
    When los 5 usuarios envían POST /projects/P1/tickets de forma simultánea
    Then se crean exactamente 5 tickets en BD
    And ningún ticket tiene created_by = NULL
    And cada ticket tiene el created_by correspondiente a su usuario
    And el AuditLog de cada ticket tiene actor_id != NULL

  Scenario: Token expira entre validación de middleware y escritura en BD
    Given Carlos tiene un JWT con exp = now + 1s
    When el middleware valida el token (válido en ese instante)
    And el handler tarda 2 segundos en procesar (simulado con delay)
    And el handler intenta escribir el ticket con created_by = Carlos.id
    Then el ticket se rechaza con error 401 o se persiste con created_by correcto
    And bajo ninguna circunstancia se persiste created_by = NULL en BD
```

#### Mitigación requerida en implementación

- Constraint `NOT NULL` en columna `created_by` de la tabla `Ticket` — enforced en BD, no solo en ORM.
- Constraint `NOT NULL` en `actor_id` de `AuditLog` — mismo principio.
- El `user_id` debe extraerse del JWT **dentro del handler**, no del objeto `request` mutable, para evitar race conditions en middlewares asíncronos.
- Test de carga con 10 requests simultáneos como parte del pipeline de CI (usar `Promise.all` en Vitest/Supertest).

---

### Matriz de Priorización Consolidada — Edge Cases MVP

| ID | Edge Case | Categoría | P | I | Score | Severidad | ¿Bloquea release? |
|---|---|---|---|---|---|---|---|
| EC-MVP-01 | Falla de red en adquisición de lock | Red + estado inconsistente | 3 | 3 | **9** | CRÍTICO | Sí |
| EC-MVP-02 | `created_by` nulo bajo concurrencia | Nulos + concurrencia | 2 | 3 | **6** | ALTO | No (pero requiere fix antes de staging) |
| TC-207 | Race condition en cambio de estado | Concurrencia | 2 | 3 | **6** | ALTO | No |
| TC-306 | Lock huérfano por crash de navegador | Red + timeout | 3 | 2 | **6** | ALTO | No |
| TC-107 | JWT válido sin rol en el proyecto | Autorización | 2 | 2 | **4** | ALTO | No |
| TC-106 | Refresh token expirado | Autenticación | 2 | 1 | **2** | MEDIO | No |
| TC-206 | Boundary 255 chars en título | Validación | 1 | 1 | **1** | MEDIO | No |

> **Lectura de la matriz:** EC-MVP-01 es el único caso con score 9 y debe tener cobertura de prueba antes del primer despliegue en staging. EC-MVP-02 y TC-207 comparten score 6 y deben resolverse antes del release final de la semana 3.
