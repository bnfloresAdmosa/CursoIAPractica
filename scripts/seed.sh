#!/usr/bin/env bash
# scripts/seed.sh
# Seed de la BD Mini Jira: 7 usuarios + 1 proyecto + 8 tags + 12 tickets.
# Idempotente: el seed.ts limpia FK-safe y reinserta. Re-ejecutable sin
# errores ni duplicados.
#
# Stack real: SQL Server 2022 + Prisma (no Supabase/MCP). Wrap del seed
# canónico en `backend/prisma/seed.ts`.
#
# Uso:
#   ./scripts/seed.sh                # ejecuta el seed
#   ./scripts/seed.sh --dry-run      # solo imprime lo que haría
#
# Requiere: pnpm, container `SQLServer2022` corriendo (vía wsl docker),
# y `backend/.env` con DATABASE_URL apuntando a esa BD.

set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

log()  { printf '\033[1;34m[seed]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[seed]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[seed]\033[0m %s\n' "$*" >&2; exit 1; }

# Pre-flight checks
[[ -d "${BACKEND_DIR}" ]] || fail "No se encuentra ${BACKEND_DIR}"
[[ -f "${BACKEND_DIR}/.env" ]] || fail "Falta ${BACKEND_DIR}/.env (corre setup-dev.sh primero)"
command -v pnpm >/dev/null 2>&1 || fail "pnpm no está instalado"

# Verificar que la BD responde antes del seed
log "Verificando conexión a SQL Server..."
if ! wsl docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^SQLServer2022$'; then
  warn "El container SQLServer2022 no parece estar corriendo. Continúa solo si la BD remota responde."
fi

if (( DRY_RUN )); then
  log "[dry-run] cd ${BACKEND_DIR}"
  log "[dry-run] pnpm db:seed"
  log "[dry-run] El script real:"
  log "[dry-run]   1. Trunca en orden FK-safe: refresh_token → ticket_lock → audit_log → comment → ticket_tag → ticket_assignee → ticket → project_member → project → tag → priority → user"
  log "[dry-run]   2. Reinserta: 3 priorities + 7 users + 8 tags + 1 project + 7 memberships + 12 tickets con assignees y tags"
  log "[dry-run]   3. Idempotente: re-ejecutar limpia primero y vuelve al estado canónico"
  exit 0
fi

log "Ejecutando pnpm db:seed (limpia + reinserta el dataset canónico)..."
cd "${BACKEND_DIR}"
pnpm db:seed

log "Seed completo. Login: laura@empresa.com / demo123"
