#!/usr/bin/env bash
# scripts/setup-dev.sh
# Setup desarrollo local Mini Jira (Express + Prisma + SQL Server + Vite).
#
# - Instala deps en backend/ y frontend/ con pnpm
# - Crea .env desde .env.example si no existe (no sobreescribe)
# - Aplica migraciones Prisma
# - Verifica que el backend responde a /api/v1/health
#
# Idempotente: re-ejecutable sin destruir estado.
#
# Uso:
#   ./scripts/setup-dev.sh
#   ./scripts/setup-dev.sh --dry-run
#
# Requiere: pnpm, node 20+, container SQLServer2022 corriendo (vía wsl docker)
# con la BD `minijira` creada.

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
FRONTEND_DIR="${REPO_ROOT}/frontend"

log()  { printf '\033[1;34m[setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[setup]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[setup]\033[0m %s\n' "$*" >&2; exit 1; }

run() {
  if (( DRY_RUN )); then
    log "[dry-run] $*"
  else
    log "→ $*"
    eval "$@"
  fi
}

# Pre-flight checks
command -v node  >/dev/null 2>&1 || fail "node no está instalado"
command -v pnpm  >/dev/null 2>&1 || fail "pnpm no está instalado (https://pnpm.io/installation)"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "${NODE_MAJOR}" -ge 20 ]] || fail "Se requiere Node 20+. Versión actual: $(node -v)"

[[ -d "${BACKEND_DIR}" ]]  || fail "No existe ${BACKEND_DIR}"
[[ -d "${FRONTEND_DIR}" ]] || fail "No existe ${FRONTEND_DIR}"

# 1. Crear .env desde .env.example si no existen
ROOT_ENV_EXAMPLE="${REPO_ROOT}/.env.example"
if [[ -f "${ROOT_ENV_EXAMPLE}" ]]; then
  for app in "${BACKEND_DIR}" "${FRONTEND_DIR}"; do
    if [[ ! -f "${app}/.env" ]]; then
      log "Creando ${app}/.env desde .env.example"
      run "cp '${ROOT_ENV_EXAMPLE}' '${app}/.env'"
    else
      log "${app}/.env ya existe — no se sobreescribe"
    fi
  done
else
  warn ".env.example no existe en raíz. Asegúrate de tener .env en backend/ y frontend/"
fi

# 2. Instalar deps
log "Instalando deps backend..."
run "cd '${BACKEND_DIR}' && pnpm install"

log "Instalando deps frontend..."
run "cd '${FRONTEND_DIR}' && pnpm install"

# 3. Generar Prisma client + aplicar migraciones
log "Aplicando migraciones Prisma (idempotente con migrate deploy)..."
run "cd '${BACKEND_DIR}' && pnpm prisma generate"
run "cd '${BACKEND_DIR}' && pnpm prisma migrate deploy"

# 4. Smoke test: ¿responde el backend?
if (( DRY_RUN )); then
  log "[dry-run] Verificación de health endpoint omitida"
else
  log "Verificación opcional: levanta el backend y golpea /api/v1/health"
  log "  Para validar manualmente: cd backend && pnpm dev"
  log "  Luego: curl http://localhost:3030/api/v1/health"
fi

log "Setup completo ✓"
log "Siguientes pasos:"
log "  1. ./scripts/seed.sh       # poblar datos demo"
log "  2. cd backend  && pnpm dev # levantar API en :3030"
log "  3. cd frontend && pnpm dev # levantar UI en :5173"
