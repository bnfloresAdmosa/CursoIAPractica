---
name: Mini Jira — convención de tests con Vitest + Supertest + prisma mock
description: Tests unitarios viven al lado del código (`*.test.ts`), mockean Prisma vía vi.mock('@/db/prisma'), levantan la app con createApp(), y atacan por HTTP con supertest. Setup global en src/test/setup.ts inyecta env vars antes de cargar lib/env.ts.
type: project
---

Convención de tests del backend Mini Jira (`backend/`):

- Vitest 2 + Supertest. Configuración en `backend/vitest.config.ts`.
- Tests viven junto al módulo: `src/modules/<x>/<x>.test.ts`.
- Setup global: `src/test/setup.ts` define `process.env.*` antes de cualquier import (vitest setupFiles corre antes de los tests).
- Helpers: `src/test/helpers.ts` con `makeAuthHeader()` (firma JWT con el mismo secret de test) y fixtures básicos.
- Patrón de mock para Prisma:
  ```ts
  vi.mock('@/db/prisma', () => {
    const mock = { ticket: { ... }, $transaction: vi.fn() };
    mock.$transaction.mockImplementation(async (cb) => cb(mock));
    return { prisma: mock };
  });
  ```
- Cada test sigue Given/When/Then en comentarios — uno por línea de assert principal.
- 3 tests por endpoint P0: Happy path, Validation error, Edge case del Gherkin (full-backlog.md).
- NO conectar a BD real en unit tests — siempre mock.
- Para tests de integración futuros (Supertest contra SQL Server real), separar en `vitest.integration.config.ts` con `--config`.

**Why:** El usuario validó este patrón en Activity 2 + Prompt 2 (testing). Mantenerlo consistente para que los siguientes tests no diverjan.

**How to apply:** Cuando agregues endpoints nuevos (Phase B locks, comments, dashboard), añade el `<modulo>.test.ts` correspondiente con 3 tests por endpoint siguiendo el patrón. Si necesitas mockear nuevas tablas, expande el objeto del `vi.mock`.
