#!/usr/bin/env bash
# Phase 6 — ufw rules for Food Diary V2 (HTTPS via Caddy, API internal only)
# Usage: sudo bash scripts/setup-ufw-phase6.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/setup-ufw-phase6.sh"
  exit 1
fi

if ! command -v ufw &>/dev/null; then
  echo "Installing ufw..."
  apt-get update && apt-get install -y ufw
fi

ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Caddy → HTTPS redirect)'
ufw allow 443/tcp comment 'HTTPS (Caddy)'

# Remove public API port if previously opened
if ufw status numbered | grep -q '5000/tcp'; then
  echo "Removing ufw rule for port 5000 (API should be internal)..."
  ufw delete allow 5000/tcp || true
fi

ufw --force enable
ufw status verbose

echo ""
echo "Done. API is reachable only via Caddy on ports 80/443."
