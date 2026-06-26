#!/usr/bin/env bash
# Phase 3 — SQLite hot backup (online, no downtime)
# Usage: bash scripts/backup.sh
# Cron (03:00 MSK on UTC server): 0 0 * * * cd /srv/foodbot && bash scripts/backup.sh >> /var/log/food-diary-backup.log 2>&1
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DATA_DIR:-/srv/foodbot/data}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"
DB_FILE="$DATA_DIR/data.db"
RETENTION="${BACKUP_RETENTION:-30}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_DIR/food-diary_${STAMP}.db"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_FILE" ]]; then
  echo "[$(date -Is)] No database at $DB_FILE — skip backup"
  exit 0
fi

cd "$DEPLOY_DIR"

backup_via_docker() {
  local container_dest="/app/data/backups/food-diary_${STAMP}.db"
  docker compose exec -T api mkdir -p /app/data/backups
  docker compose exec -T api sqlite3 /app/data/data.db ".backup '${container_dest}'"
  echo "[$(date -Is)] Backup created: $DEST"
}

backup_via_host_sqlite3() {
  sqlite3 "$DB_FILE" ".backup '${DEST}'"
  echo "[$(date -Is)] Backup created: $DEST"
}

if docker compose ps --status running api 2>/dev/null | grep -q api; then
  backup_via_docker
elif command -v sqlite3 &>/dev/null; then
  backup_via_host_sqlite3
else
  echo "[$(date -Is)] ERROR: API container not running and sqlite3 not installed on host" >&2
  exit 1
fi

# Prune old backups (keep newest RETENTION files)
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/food-diary_*.db 2>/dev/null | tail -n +"$((RETENTION + 1))" || true)
for f in "${OLD[@]}"; do
  rm -f "$f"
  echo "[$(date -Is)] Pruned old backup: $f"
done
