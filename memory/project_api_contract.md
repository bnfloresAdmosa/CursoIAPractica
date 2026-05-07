---
name: Mini Jira — API contract v1 aprobado
description: Decisiones canónicas del API contract Mini Jira v1, aprobadas el 2026-05-06. Aplican a la implementación del backend Express.
type: project
---

`api-contract.md` (raíz del repo) es el contrato canónico del backend Mini Jira. Aprobado el 2026-05-06.

**Decisiones canónicas (no abrir a debate sin checkpoint con el usuario):**

1. **Envelope:** REST plano. Success retorna el recurso directo; error siempre `{error: {code, message, details?}}`.
2. **Rutas:** `/api/v1/...` kebab-case versionado. Plural inglés. Anidación para ownership (`/projects/:id/tickets`, `/tickets/:id/comments`).
3. **Paginación:** cursor-based `?cursor=...&limit=20`. Response `{items, nextCursor, hasMore}`. Aplica a tickets, comments, audit log, search.
4. **Errores:** `{error: {code, message, details?}}` con tabla de codes específica (ver §1.6 del contrato). Validation errors (422) llevan `details` map de campo→mensaje.
5. **IDs:** numéricos enteros en BD y JSON. Frontend migrará de `'p1'/'u1'/'T-112'` a int al integrar.
6. **Status del ticket:** literal en español (`"Por hacer"` / `"En progreso"` / `"Listo"`) en BD, JSON y `audit_log`. Match con CLAUDE.md §6.1.
7. **Priority:** objeto `{id, name, order}` (tabla, no enum). Match con ER §er.md.
8. **Casing:** JSON camelCase, BD snake_case (Prisma `@map`).
9. **Auth:** Bearer header-only (sin cookies → sin CSRF). Refresh token single-use (rotation). Access TTL 1h, refresh TTL 7d.
10. **Tags:** catálogo **global** (cualquier Admin lo gestiona). Catálogo inicial = `bug`, `feature`, `mejora`, `seguridad`, `deuda-técnica` (del seed mock.sql).
11. **Force unlock (TC-307):** diferido a v1.1 — NO implementar en MVP.
12. **Lock idempotente:** `POST /tickets/:id/lock` por el mismo usuario que ya lo tiene → 200 con lock existente. NUNCA duplica registros (EC-MVP-01 score 9 CRÍTICO).
13. **Auditoría:** se escribe en la misma transacción que el cambio. Sin endpoints UPDATE/DELETE. En prod, revocar permisos `UPDATE/DELETE` sobre `audit_log` al usuario de aplicación.

**Why:** El contrato es la fuente de verdad para implementar P0/P1/P2 en el backend. Sin alineación canónica, cada handler arriesga divergir.

**How to apply:** Cuando llegue el momento de implementar handlers Express, leer `api-contract.md` antes de tocar `backend/src/modules/<x>/router.ts`. Cualquier desviación (ej: agregar campo, cambiar status code) requiere actualizar el contrato y mencionar al usuario antes de codear.
