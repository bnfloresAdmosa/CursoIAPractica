#!/usr/bin/env bash
# scripts/cleanup.sh
# Limpia el estado de desarrollo local de Mini Jira.
#
# - Trunca todas las tablas de la BD `minijira` en orden FK-safe (deja schema intacto)
# - Borra archivos temporales (tmp/, *.log, coverage/)
#
# Idempotente: re-ejecutable.
#
# Uso:
#   ./scripts/cleanup.sh
#   ./scripts/cleanup.sh --dry-run
#   ./scripts/cleanup.sh --keep-data    # solo limpia tmp/, no toca BD
#
# ⚠️ Limpia TODOS los datos de la BD `minijira`. Para dev only.

set -euo pipefail

DRY_RUN=0
KEEP_DATA=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=1 ;;
    --keep-data) KEEP_DATA=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"

log()  { printf '\033[1;34m[cleanup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[cleanup]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[cleanup]\033[0m %s\n' "$*" >&2; exit 1; }

run() {
  if (( DRY_RUN )); then
    log "[dry-run] $*"
  else
    log "→ $*"
    eval "$@"
  fi
}

# 1. Truncate de la BD (orden FK-safe)
if (( ! KEEP_DATA )); then
  log "Truncando tablas de minijira (FK-safe)..."

  # SQL Server requiere DELETE (TRUNCATE falla con FKs activas).
  # Orden: hijas → padres.
  TRUNCATE_SQL="
DELETE FROM refresh_token;
DELETE FROM ticket_lock;
DELETE FROM audit_log;
DELETE FROM comment;
DELETE FROM ticket_tag;
DELETE FROM ticket_assignee;
DELETE FROM ticket;
DELETE FROM project_member;
DELETE FROM project;
DELETE FROM tag;
DELETE FROM priority;
DELETE FROM [user];
"

  if (( DRY_RUN )); then
    log "[dry-run] Ejecutaría:"
    echo "${TRUNCATE_SQL}" | sed 's/^/  /'
  else
    # Resolver password desde backend/.env
    if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
      fail "Falta ${BACKEND_DIR}/.env"
    fi
    SA_PASS=$(grep '^MSSQL_SA_PASSWORD=' "${BACKEND_DIR}/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
    [[ -n "${SA_PASS}" ]] || fail "MSSQL_SA_PASSWORD no encontrada en backend/.env"

    log "Ejecutando truncate vía sqlcmd dentro de SQLServer2022..."
    echo "${TRUNCATE_SQL}" | wsl docker exec -i SQLServer2022 \
      /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -No -d minijira
  fi
else
  log "--keep-data: BD intacta"
fi

# 2. Limpiar archivos temporales
log "Limpiando archivos temporales..."
TMP_PATHS=(
  "${REPO_ROOT}/tmp"
  "${BACKEND_DIR}/coverage"
  "${BACKEND_DIR}/dist"
  "${FRONTEND_DIR}/dist"
  "${FRONTEND_DIR}/coverage"
)
for p in "${TMP_PATHS[@]}"; do
  if [[ -e "${p}" ]]; then
    run "rm -rf '${p}'"
  fi
done

# Logs sueltos
log "Borrando *.log..."
if (( DRY_RUN )); then
  find "${REPO_ROOT}" -name '*.log' -not -path '*/node_modules/*' -print 2>/dev/null | head -20 | sed 's/^/  [dry-run] rm /' || true
else
  find "${REPO_ROOT}" -name '*.log' -not -path '*/node_modules/*' -delete 2>/dev/null || true
fi

log "Cleanup completo ✓"
