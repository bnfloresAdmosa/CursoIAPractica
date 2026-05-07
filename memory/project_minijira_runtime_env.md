---
name: Mini Jira — entorno de ejecución local del usuario
description: El laptop tiene un container `SQLServer2022` reutilizado, port 3000 ocupado por Grafana, backend de Mini Jira movido a 3030.
type: project
---

Hechos del entorno local del proyecto **Mini Jira** (`CursoIAPractica/`) detectados al onboardear:

- **SQL Server**: ya existe un container llamado `SQLServer2022` (imagen `mcr.microsoft.com/mssql/server:2022-latest`) escuchando en `:1433`. Mini Jira **lo reutiliza**, no levanta su propio container. La base se llama `minijira` y se crea con `wsl docker exec -i SQLServer2022 ... sqlcmd -Q "CREATE DATABASE minijira"`.
- **Conflictos de puerto**:
  - `:3000` está ocupado por `admosa_grafana` → backend Express se movió a **`:3030`** (configurado en `backend/src/lib/env.ts` y `.env.example`).
  - `:80` ocupado por `admosa_gateway` (no afecta Mini Jira).
  - `:5173` libre — frontend ahí.
- **`docker-compose.yml`** del proyecto queda como **fallback greenfield**, no se usa en este laptop (chocaría con el `SQLServer2022` existente al bind 1433).
- **Stack vecino**: el laptop también corre `admosa_*` (microservicios, RabbitMQ, Redis, Qdrant, Grafana/Prometheus/Loki). No interfieren con Mini Jira más allá del puerto 3000.

**Why:** El usuario indicó "ya tengo un container con sql server 2022" y mostró `wsl docker ps`. Adaptar evita levantar containers redundantes y choques de puerto.

**How to apply:** Cualquier instrucción de "levantar el stack" para este proyecto debe usar `wsl docker` (no `docker`), saltarse `docker compose up`, y asumir backend en `:3030` (no `:3000`). Si el usuario en otra ocasión menciona estar en otra máquina sin estos containers, validar antes de asumir.

**Networking Windows ↔ WSL Docker:** El host Windows **no resuelve `localhost:1433`** hacia el container `SQLServer2022` (Docker está dentro de WSL, no usa Docker Desktop con port-forwarding automático). El usuario corrige `DATABASE_URL` para apuntar a la IP de WSL2 (ej: `172.21.18.232:1433`). Esa IP cambia entre reinicios — no hardcodearla en código; obtenerla con `wsl hostname -I` o leerla de la `.env` que el usuario edita manualmente. Aplica también a otros servicios expuestos por containers WSL (Redis, RabbitMQ, etc.).
