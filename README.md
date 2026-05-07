# Mini Jira

Herramienta interna ligera de gestión de tickets — MVP para un equipo de ~10 personas. Permite crear proyectos, gestionar tickets en un tablero kanban, asignar responsables y dar seguimiento mediante un dashboard de métricas, sin la complejidad de Jira.

---

## Tecnologías

### Frontend

| Categoría | Herramienta |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Routing | React Router DOM v7 |
| Estado servidor | TanStack Query v5 |
| Estado UI | Zustand |
| Drag & Drop | @dnd-kit/core |
| Estilos | CSS plano con design tokens (variables CSS) |
| Lint / Format | ESLint + Prettier |

### Backend

| Categoría | Herramienta |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express 4 |
| ORM | Prisma 6 (provider `sqlserver`) |
| Validación | Zod + `@asteasolutions/zod-to-openapi` |
| Auth | JWT (access + refresh) + bcryptjs |
| Logging | pino + pino-http |
| Seguridad HTTP | helmet + cors |
| Documentación API | swagger-ui-express (`/api/v1/docs`) |
| Tests | Vitest + Supertest |
| Lint / Format | ESLint + Prettier |

### Base de datos e infraestructura

| Categoría | Herramienta |
|---|---|
| Motor BD | Microsoft SQL Server 2022 |
| Contenedores | Docker (vía WSL) + docker-compose |
| Documentación | MkDocs (`docs/` + `mkdocs.yml`) |

---

## Estructura del repositorio

```
CursoIAPractica/
├── backend/                  # API Express + Prisma + SQL Server
│   ├── prisma/
│   │   ├── migrations/       # migraciones Prisma
│   │   ├── schema.prisma     # modelos (provider sqlserver)
│   │   └── seed.ts           # datos demo
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # router, service, schemas, tests
│   │   │   ├── projects/     # router, service, schemas, tests
│   │   │   └── tickets/      # router, service, schemas, tests
│   │   ├── middleware/       # authenticate, errorHandler
│   │   ├── db/               # cliente Prisma singleton
│   │   ├── lib/              # jwt, hash, env, logger, helpers
│   │   ├── openapi/          # registry + generador del documento OpenAPI
│   │   ├── test/             # helpers + setup para Vitest
│   │   ├── types/
│   │   ├── app.ts            # factory de la app Express
│   │   └── server.ts         # punto de entrada HTTP
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── eslint.config.js
│   ├── openapi.yaml          # spec exportada
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── package.json
│
├── frontend/                 # SPA React + Vite
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/         # LoginScreen, RequireAuth, useAuth
│   │   │   ├── board/        # BoardScreen, BoardFilters, hooks
│   │   │   ├── projects/     # ProjectsScreen, NewProjectCard
│   │   │   ├── tickets/
│   │   │   ├── comments/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   │   ├── ui/           # Avatar, Badge, Btn, Chips, TicketCard, etc.
│   │   │   ├── layout/       # AppLayout, SideBar, TopBar
│   │   │   └── board/        # KanbanBoard, KanbanColumn
│   │   ├── lib/              # api, queryClient, types, mock-data
│   │   ├── routes/
│   │   ├── store/            # zustand stores
│   │   ├── styles.css        # design tokens y clases del prototipo
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── eslint.config.js
│   ├── vite.config.ts
│   ├── tsconfig*.json
│   └── package.json
│
├── Base-Specs/               # PRD original, ADR, ER, secuencia, mock.sql, TestPlan
├── Specs-MiniJira/           # PRD canónico v1.0 + backlog completo + compact backlog
├── Prototype/                # HTML/JSX de referencia visual (no se construye)
│   └── screens/              # Login, Projects, Board, TicketDetail, etc.
├── docs/                     # Documentación MkDocs (api-reference, base-de-datos, etc.)
├── scripts/                  # setup-dev.sh, seed.sh, cleanup.sh
├── Capturas/                 # Capturas de pantalla
│
├── api-contract.md           # contrato REST canónico
├── database-schema.yaml      # esquema BD canónico
├── docker-compose.yml        # SQL Server 2022 (fallback greenfield)
├── mkdocs.yml                # configuración MkDocs
├── .env.example
├── CLAUDE.md                 # guía operativa para agentes IA
└── README.md
```

---

## Requisitos previos

- Node.js 20+ y `pnpm`
- Docker (vía WSL en Windows)
- Microsoft SQL Server 2022 corriendo en `:1433` (puede ser un container existente o el de `docker-compose.yml`)

---

## Setup rápido

```powershell
# 1. Variables de entorno
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
# Editar backend\.env con el password real del SQL Server

# 2. Crear base de datos (asumiendo container SQLServer2022)
wsl docker exec -i SQLServer2022 /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P 'TU_SA_PASSWORD' -No `
  -Q "IF DB_ID('minijira') IS NULL CREATE DATABASE minijira"

# 3. Instalar dependencias y migrar
cd backend;  pnpm install; pnpm prisma:migrate; pnpm db:seed
cd ..\frontend; pnpm install
```

## Día a día

```powershell
# Terminal A — backend en :3030
cd backend; pnpm dev

# Terminal B — frontend en :5173
cd frontend; pnpm dev
```

- API: http://localhost:3030/api/v1
- Swagger UI: http://localhost:3030/api/v1/docs
- Web: http://localhost:5173

---

## Más documentación

- `CLAUDE.md` — guía operativa, convenciones de código y reglas de negocio.
- `Specs-MiniJira/specs.md` — PRD canónico.
- `api-contract.md` — contrato REST.
- `database-schema.yaml` — esquema de base de datos.
- `docs/` — documentación adicional servida con MkDocs.
