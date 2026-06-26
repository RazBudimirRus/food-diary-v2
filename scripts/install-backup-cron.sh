#!/usr/bin/env bash
# Install daily backup cron — 03:00 MSK (00:00 UTC)
# Usage: sudo bash scripts/install-backup-cron.sh
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_USER="${SUDO_USER:-$USER}"
LOG_FILE="/var/log/food-diary-backup.log"
CRON_LINE="0 0 * * * cd ${DEPLOY_DIR} && DATA_DIR=/srv/foodbot/data bash scripts/backup.sh >> ${LOG_FILE} 2>&1"

touch "$LOG_FILE"
chown "$CRON_USER:$CRON_USER" "$LOG_FILE" 2>/dev/null || true

EXISTING=$(crontab -u "$CRON_USER" -l 2>/dev/null || true)
if echo "$EXISTING" | grep -qF "scripts/backup.sh"; then
  echo "Backup cron already installed for $CRON_USER"
  exit 0
fi

(crontab -u "$CRON_USER" -l 2>/dev/null; echo "$CRON_LINE") | crontab -u "$CRON_USER" -
echo "Installed daily backup cron for $CRON_USER (00:00 UTC = 03:00 MSK)"
echo "Log: $LOG_FILE"
crontab -u "$CRON_USER" -l | grep backup.sh
