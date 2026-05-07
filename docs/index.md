# Mini Jira

Herramienta interna de gestión de tickets — MVP de 3 semanas para un equipo de ~10 personas. Inspirada en Jira pero ligera, intuitiva y con estética Apple/Vercel.

## Stack

| Capa | Decisión |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estado servidor | TanStack Query 5 |
| Routing | React Router v7 |
| Drag & Drop | `@dnd-kit/core` |
| Backend | Node 20 + Express 4 + TypeScript |
| ORM | Prisma 6 (provider `sqlserver`) |
| BD | Microsoft SQL Server 2022 (override de ADR-001) |
| Auth | JWT access + refresh con rotación single-use, bcryptjs |
| Validación | Zod en handlers, CHECK constraints en BD |
| API docs | `@asteasolutions/zod-to-openapi` + Swagger UI |
| Tests | Vitest + Supertest |

## Documentación

- **[Referencia de API](api-reference.md)** — todos los endpoints P0 implementados con `curl` de ejemplo.
- **[Diagramas](diagramas.md)** — flujos de auth con JWT, mover ticket con audit log, ciclo de vida del ticket.
- **[Base de datos](base-de-datos.md)** — ERD Mermaid de las 12 tablas + reglas de negocio enforcement.
- **[Cobertura de tests](cobertura-tests.md)** — historias de usuario vs tests existentes.

## Endpoints clave

- `http://localhost:3030/api/v1` — base path del API.
- `http://localhost:3030/api/v1/health` — healthcheck.
- `http://localhost:3030/api/v1/docs` — Swagger UI.
- `http://localhost:5173` — frontend (Vite dev server).

## Cómo levantar el stack en local

```bash
# 1. Setup inicial (instala deps + crea .env + aplica migraciones)
./scripts/setup-dev.sh

# 2. Poblar datos demo (7 users, 1 proyecto, 12 tickets)
./scripts/seed.sh

# 3. Levantar dev servers (en dos terminales)
cd backend  && pnpm dev   # API en :3030
cd frontend && pnpm dev   # UI  en :5173

# 4. Abrir el navegador en http://localhost:5173
#    Login: laura@empresa.com / demo123
```

## Spec canónica

La fuente de verdad vive en la raíz del repo:

- `api-contract.md` — contrato HTTP aprobado.
- `database-schema.yaml` — schema canónico SQL Server.
- `CLAUDE.md` — guía operativa para agentes y devs.
- `Specs-MiniJira/` — PRD + backlog completo (16 historias en Gherkin).
- `Base-Specs/` — artefactos del análisis: ER, secuencia, ADR, mock data, plan de pruebas.

## Estado del MVP

- ✅ **Phase A (P0)** — Auth (login/refresh/logout con rotación), CRUD de proyectos, CRUD de tickets básico, cambio de status con audit log inmutable, archive idempotente.
- 🚧 **Phase B (P0)** — Pessimistic locks (`POST/DELETE /tickets/:id/lock`), `PATCH /tickets/:id` con guard de lock, `force unlock` diferido a v1.1.
- ⏳ **P1** — Comments, assignees, tags CRUD, project members CRUD.
- ⏳ **P2** — Dashboard, audit log lectura, búsqueda global.

Ver `cobertura-tests.md` para el detalle por historia.
