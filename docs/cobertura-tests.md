# Cobertura de Tests — Mini Jira API

**Fuente backlog:** `Specs-MiniJira/full-backlog.md` (16 HUs en sintaxis Gherkin).
**Fuente tests:** `backend/src/modules/{auth,projects,tickets}/*.test.ts`.
**Fecha:** auto-generado por Agente-Cobertura.

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Tests totales (`it()`) | **39** |
| HUs cubiertas | **6 / 16** (37.5%) |
| HUs parciales | **2 / 16** (12.5%) |
| HUs sin tests | **8 / 16** (50%) |
| HUs P0 cubiertas | **4 / 6** (HU-01, HU-02, HU-05, HU-07; **faltan** HU-06, HU-12) |
| HUs P1 cubiertas | **2 / 7** (HU-03, HU-04 completas; HU-08 parcial; **faltan** HU-09, HU-10, HU-13, HU-14) |
| HUs P2 cubiertas | **0 / 3** (HU-11, HU-15, HU-16 sin tests) |

**Distribución por archivo:**

| Archivo | Tests |
|---|---|
| `backend/src/modules/auth/auth.test.ts` | 9 |
| `backend/src/modules/projects/projects.test.ts` | 15 |
| `backend/src/modules/tickets/tickets.test.ts` | 15 |

**Bloqueador para liberar MVP:** HU-12 (Pessimistic Locking, P0) y HU-06 (Editar ticket, P0) carecen totalmente de tests porque sus endpoints aún no existen — Phase B pendiente.

---

## Tabla de cobertura por HU

| HU | Título | Prioridad | Tests asociados | Estado |
|---|---|---|---|---|
| **HU-01** | Login con usuario y contraseña | P0 | `auth.test.ts`: "Happy: credenciales válidas → 200 + tokens"; "Validation: email con formato inválido → 422 validation_error"; "Edge HU-01 borde: email no registrado → 401 invalid_credentials (mensaje genérico)" | ✅ cubierta |
| **HU-02** | Control de roles por proyecto | P0 | `projects.test.ts`: "Edge HU-02 borde: usuario no es miembro → 403 forbidden_member"; "Edge HU-04 borde: Usuario (no Admin) intenta editar → 403"; `tickets.test.ts`: "Edge HU-08 borde: USER intenta archivar → 403 forbidden_role"; "Edge: ticket existe pero user no es miembro del proyecto → 403" | ✅ cubierta |
| **HU-03** | Crear proyecto | P1 | `projects.test.ts`: "Happy: crea proyecto + creador queda como ADMIN (transacción)"; "Validation: name vacío → 422"; "Edge HU-03 borde: nombre duplicado se permite (no únicos globalmente)" | ✅ cubierta |
| **HU-04** | Archivar proyecto | P1 | `projects.test.ts`: "Happy: Admin archiva → 200 + archivedAt timestamp"; "Validation: id inválido → 400"; "Edge HU-04 borde: re-archivar es idempotente → 200 con timestamp nuevo"; "Edge HU-04 borde: Usuario (no Admin) intenta editar → 403" (cubre escenario "Usuario sin rol Admin intenta archivar") | ✅ cubierta |
| **HU-05** | Crear ticket | P0 | `tickets.test.ts`: "Happy: miembro crea ticket con prioridad → 201"; "Validation HU-05 borde: title de 256 chars → 422"; "Edge HU-09 borde: assignee no es miembro del proyecto → 422 con details". Falta escenario de "[BORDE] Usuario intenta crear ticket en proyecto al que no pertenece" (no test directo — cubierto indirectamente por `forbidden_member` en otros endpoints, no en POST tickets). Falta "[BORDE] Prioridad no enviada → 422" — Zod lo rechaza pero sin test explícito. | ⚠️ parcial |
| **HU-06** | Editar ticket | P0 | _ninguno_ — el endpoint `PATCH /tickets/:id` NO existe aún (Phase B: requiere lock). Los handlers de status y archive existen pero edición general (title/description/priority) no se ha implementado. | ❌ sin tests |
| **HU-07** | Cambiar estado de ticket | P0 | `tickets.test.ts`: "Happy HU-07: Admin cambia status → 200 + audit_log INSERT en transacción"; "Validation HU-07 borde: status fuera del catálogo → 422"; "Edge: idempotente — mismo status que el actual → 200 sin INSERT en audit_log". **Falta** el escenario "[BORDE] Cambio de estado sin bloqueo activo → 409" porque el lock check aún no está implementado en el handler (Phase B). | ⚠️ parcial |
| **HU-08** | Archivar ticket | P1 | `tickets.test.ts`: "Happy HU-08: Admin archiva ticket → 200 con archivedAt"; "Validation: id inválido → 400"; "Edge HU-08 borde: USER intenta archivar → 403 forbidden_role". **Falta** "[BORDE] Archivar ticket ya archivado → 200 idempotente" (cubierto solo en HU-04 para proyectos, no para tickets). | ⚠️ parcial |
| **HU-09** | Asignar y reasignar usuarios | P1 | _ninguno_ — el endpoint `PATCH /tickets/:id/assignees` NO existe aún (P1, sin implementar). Solo se cubre el borde "assignee no es miembro" desde POST `/tickets` create. | ❌ sin tests |
| **HU-10** | Agregar comentario | P1 | _ninguno_ — endpoint `POST /tickets/:id/comments` NO existe aún. | ❌ sin tests |
| **HU-11** | Editar y eliminar comentario propio | P2 | _ninguno_ — endpoints de comments NO existen. | ❌ sin tests |
| **HU-12** | Pessimistic locking | P0 | _ninguno_ — endpoints `POST/GET/DELETE /tickets/:id/lock` NO existen aún (Phase B). EC-MVP-01 (idempotencia, score 9 CRÍTICO) sin cobertura. | ❌ sin tests |
| **HU-13** | Filtrar tickets | P1 | _ninguno_ explícito — el handler acepta `?status=`, `?priority=`, etc. (verificado en `tickets/router.ts`) pero ningún test ejercita filtros AND combinados ni el escenario "[BORDE] Filtros sin resultados → estado vacío". | ❌ sin tests |
| **HU-14** | Dashboard de métricas | P1 | _ninguno_ — endpoint `GET /projects/:id/dashboard` NO existe aún (P2 según roadmap). | ❌ sin tests |
| **HU-15** | Notificación al ser asignado | P2 | _ninguno_ — la integración con email (Resend/SMTP) NO está implementada. El handler `POST /tickets` ni `PATCH /tickets/:id/assignees` dispara emails todavía. | ❌ sin tests |
| **HU-16** | Notificación por mención | P2 | _ninguno_ — endpoint de comments + parseo de `@menciones` NO existe. | ❌ sin tests |

---

## Edge cases del Gherkin sin test correspondiente

Lista de escenarios `[BORDE]` del backlog **sin** un `it()` que los cubra. Ordenado por HU.

### HU-01 · Login

| Escenario faltante | Archivo donde debería ir |
|---|---|
| `[BORDE] Contraseña incorrecta → 401 + mensaje genérico (sin distinguir de email no registrado)` | `auth.test.ts` — agregar `it()` que mockee `prisma.user.findUnique` retornando un user, `bcrypt.compare → false`, esperar `401 invalid_credentials` con mismo `message` que el caso "email no registrado" | 
| `[BORDE] Campos vacíos → validación en línea sin llamada al backend` | `auth.test.ts` — `POST /auth/login` con `{}` → `422 validation_error` con `details.email` y `details.password` |
| `[BORDE] JWT expirado → 401 + cliente refresh → si refresh expiró, redirige a login` | `auth.test.ts` — generar JWT con `expiresIn: '-1s'`, hacer cualquier request protegida, esperar `401 unauthorized` |

### HU-02 · Roles

| Escenario faltante | Archivo donde debería ir |
|---|---|
| `Scenario: Usuario edita únicamente sus tickets asignados (Happy)` | `tickets.test.ts` — necesita endpoint `PATCH /tickets/:id` (Phase B) |
| `[BORDE] Usuario intenta editar ticket no asignado → 403` | `tickets.test.ts` — necesita endpoint `PATCH /tickets/:id` |
| `Scenario: Admin gestiona cualquier ticket del proyecto (Happy)` | `tickets.test.ts` — necesita `PATCH /tickets/:id` |
| `Scenario: Usuario con doble rol en proyectos distintos` | `projects.test.ts` o `tickets.test.ts` — JWT con `roles: { '1': 'ADMIN', '2': 'USER' }`, verificar que en proyecto 2 el archive devuelve 403 mientras en 1 funciona |

### HU-05 · Crear ticket

| Escenario faltante | Archivo donde debería ir |
|---|---|
| `Scenario: Creación con todos los campos opcionales (descripción, etiquetas, asignados)` | `tickets.test.ts` — agregar `it()` con body completo y assert de relaciones `TicketAssignee` y `TicketTag` creadas |
| `[BORDE] Prioridad no enviada → 422 "La prioridad es obligatoria"` | `tickets.test.ts` — agregar test sin `priorityId` en body |
| `[BORDE] Usuario intenta crear ticket en proyecto al que no pertenece → 403` | `tickets.test.ts` — `projectMember.findUnique → null`, esperar `403 forbidden_member` |

### HU-07 · Cambiar estado

| Escenario faltante | Archivo donde debería ir |
|---|---|
| `Scenario: Todas las transiciones son válidas (Listo → Por hacer)` | `tickets.test.ts` — agregar `it()` que pruebe la transición regresiva |
| `[BORDE] Cambio de estado sin bloqueo activo → 409 lock_required` | `tickets.test.ts` — **bloqueado por Phase B**: el lock check aún no se aplica. Agregar cuando el handler valide lock. |

### HU-08 · Archivar ticket

| Escenario faltante | Archivo donde debería ir |
|---|---|
| `[BORDE] Archivar ticket ya archivado → 200 idempotente con timestamp nuevo` | `tickets.test.ts` — equivalente al de HU-04 pero para tickets |

### HU-09 · Asignar usuarios (sin endpoint)

Todos los escenarios del Gherkin requieren `PATCH /tickets/:id/assignees`. El único cubierto es el borde "assignee no es miembro" como validation en POST create.

### HU-10..HU-16

Sin endpoints implementados → 0% cobertura. Edge cases listados solo para referencia futura:

- HU-10: comentario vacío (422), no-asignado intenta comentar (403), comentario sin lock activo del ticket (200 — comentarios NO requieren lock).
- HU-11: editar comentario ajeno (403), editar comentario soft-deleted (404), Admin elimina comentario ajeno (200).
- HU-12: 8 escenarios incluyendo idempotencia EC-MVP-01 (CRÍTICO score 9), timeout 15min, lock huérfano, reabrir mismo ticket por mismo user.
- HU-13: filtros AND combinados, búsqueda por texto, filtros sin resultados, filtros en proyecto archivado.
- HU-14: tickets cerrados por mes desde audit_log, distribución por estado, proyecto sin tickets (sin error de div/0), ticket reabierto cuenta en mes original.
- HU-15: email enviado al asignar, múltiples emails para múltiples assignees, fallo del proveedor de email NO revierte (HU-15 borde — fire-and-forget).
- HU-16: parseo de `@menciones`, mención a usuario inexistente sin error, auto-mención NO notifica, deduplicación de menciones repetidas.

---

## Recomendaciones

Orden de prioridad para reducir riesgo antes de release:

### Bloqueadores P0 (deben resolverse antes de MVP)

1. **HU-12 — Pessimistic Locking + EC-MVP-01.** Score 9 CRÍTICO. Implementar Phase B (endpoints lock) y luego agregar al menos 6 tests:
   - Adquirir lock por primer usuario → 200.
   - Adquirir lock cuando otro usuario lo tiene → 409 con `details.lockedBy`.
   - **Idempotente** — mismo usuario re-adquiere su propio lock → 200 sin duplicar registro (EC-MVP-01).
   - Lock expirado (`expires_at < NOW`) tratado como inexistente → 200 al re-adquirir.
   - Liberar lock por dueño → 204; liberar lock ajeno → 403.
   - `PATCH /tickets/:id/status` sin lock activo → 409 `lock_required`.
2. **HU-06 — Editar ticket.** Implementar `PATCH /tickets/:id` (con lock check) y agregar 3 tests: happy, validation (`title=""`), borde (USER no asignado → 403).
3. **Completar HU-05** — agregar tests faltantes (campos opcionales, sin priorityId, no miembro → 403).
4. **Completar HU-01** — agregar 3 tests de bordes pendientes (contraseña incorrecta, campos vacíos, JWT expirado).

### Core P1 (siguiente sprint)

5. **HU-09** — implementar `PATCH /tickets/:id/assignees` y agregar 5 tests (un asignado, múltiples, quitar, USER intenta asignar → 403, asignado externo → 422 con details).
6. **HU-10** — implementar `POST /tickets/:id/comments` y agregar 5 tests (cubrir el escenario clave: comentar mientras otro tiene lock → 201).
7. **HU-13 — Filtros.** El handler ya acepta los query params (`status`, `priority`, `tag`, `assignee`, `q`); agregar 4 tests que ejerciten cada filtro y la combinación AND.
8. **HU-08 — borde** "ya archivado idempotente" — agregar el test análogo a HU-04.

### Opcionales P2

9. HU-11 (editar/eliminar comentario propio) y HU-14 (dashboard) son P2 — diferibles a v1.1 según el PRD §3.
10. HU-15/HU-16 (emails) requieren integración con Resend/SMTP — el patrón "fire-and-forget" del `api-contract.md` §1.3 facilita testear que la falla del proveedor no rompe el endpoint.

### Observación transversal

Los tests actuales mockean Prisma con `vi.mock('@/db/prisma')`; los nuevos deben seguir la misma convención (`memory/project_test_setup.md`). Cuando agregues tests para HU-12 (locks), considera testear la transacción `INSERT audit_log + UPDATE ticket` con `$transaction.mockImplementation` que simule un fallo del INSERT y verifique que el UPDATE se revierte.

**No se escribieron tests en este reporte — solo recomendaciones.** Las implementaciones de Phase B (locks) y P1 (comments, assignees, filtros) son prerrequisito para los tests recomendados.
