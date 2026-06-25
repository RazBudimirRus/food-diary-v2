#!/usr/bin/env bash
# =============================================================================
#  preflight-check.sh — Food Diary V2 pre-install readiness check
#  Target: Ubuntu 24.04 LTS
#  Usage:  sudo bash preflight-check.sh [--fix]
# =============================================================================
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Globals ───────────────────────────────────────────────────────────────────
ERRORS=0
WARNINGS=0
FIX_MODE=0
LOG_FILE="/tmp/food_diary_preflight_$(date +%Y%m%d_%H%M%S).log"

[[ "${1:-}" == "--fix" ]] && FIX_MODE=1

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo -e "$*" | tee -a "$LOG_FILE"; }
ok()   { log "  ${GREEN}✓${RESET}  $*"; }
warn() { log "  ${YELLOW}⚠${RESET}  $*"; ((WARNINGS++)) || true; }
fail() { log "  ${RED}✗${RESET}  $*"; ((ERRORS++)) || true; }
info() { log "  ${CYAN}→${RESET}  $*"; }
section() { log "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

# ── Minimum requirements ──────────────────────────────────────────────────────
REQ_RAM_MB=1024          # 1 GB RAM minimum
REQ_DISK_GB=5            # 5 GB free disk
APP_PORT=5000            # Node.js/Express API
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
DEPLOY_DIR="/srv/foodbot"
DATA_DIR="/srv/foodbot/data"

# =============================================================================
log ""
log "${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
log "${BOLD}║   Food Diary V2 — Pre-install Readiness Check       ║${RESET}"
log "${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
log "  Log: $LOG_FILE"
log "  Fix mode: $([ $FIX_MODE -eq 1 ] && echo 'ON (--fix)' || echo 'OFF')"

# =============================================================================
section "1. OS & Privileges"
# =============================================================================

# Root check
if [[ $EUID -eq 0 ]]; then
  ok "Running as root"
else
  fail "Must run as root: sudo bash $0"
fi

# OS version
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  OS_NAME="$NAME $VERSION_ID"
  if [[ "$ID" == "ubuntu" ]]; then
    if [[ "$VERSION_ID" == "24.04" || "$VERSION_ID" == "22.04" ]]; then
      ok "OS: $OS_NAME (supported)"
    else
      warn "OS: $OS_NAME — tested on 22.04/24.04, yours may work but is not verified"
    fi
  else
    warn "OS: $OS_NAME — not Ubuntu, proceed with caution"
  fi
else
  fail "Cannot determine OS (/etc/os-release missing)"
fi

# Systemd
if systemctl --version &>/dev/null; then
  ok "systemd is running"
else
  fail "systemd not found (required for Docker daemon)"
fi

# =============================================================================
section "2. Hardware Resources"
# =============================================================================

# RAM
RAM_MB=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
if [[ $RAM_MB -ge $REQ_RAM_MB ]]; then
  ok "RAM: ${RAM_MB} MB (>= ${REQ_RAM_MB} MB required)"
else
  fail "RAM: ${RAM_MB} MB — minimum ${REQ_RAM_MB} MB required"
fi

# Disk — check DEPLOY_DIR parent or /srv
CHECK_DISK_PATH="/"
if df "$CHECK_DISK_PATH" &>/dev/null; then
  DISK_FREE_GB=$(df -BG "$CHECK_DISK_PATH" | awk 'NR==2 {gsub("G",""); print $4}')
  if [[ $DISK_FREE_GB -ge $REQ_DISK_GB ]]; then
    ok "Free disk on /: ${DISK_FREE_GB} GB (>= ${REQ_DISK_GB} GB required)"
  else
    fail "Free disk on /: ${DISK_FREE_GB} GB — minimum ${REQ_DISK_GB} GB required"
  fi
fi

# CPU cores
CPU_CORES=$(nproc)
if [[ $CPU_CORES -ge 1 ]]; then
  ok "CPU: $CPU_CORES core(s)"
else
  warn "Could not determine CPU count"
fi

# =============================================================================
section "3. Network & Connectivity"
# =============================================================================

# Internet access
if curl -fsSL --max-time 10 https://registry-1.docker.io/v2/ &>/dev/null; then
  ok "Internet access: reachable (Docker Hub)"
else
  fail "Internet access: cannot reach Docker Hub (registry-1.docker.io) — required for docker pull"
fi

# DNS resolution
if getent hosts github.com &>/dev/null; then
  ok "DNS resolution: working"
else
  fail "DNS resolution: failed (getent hosts github.com)"
fi

# Telegram API
if curl -fsSL --max-time 10 https://api.telegram.org &>/dev/null; then
  ok "Telegram API: reachable (api.telegram.org)"
else
  warn "Telegram API: not reachable — bot won't work. Check firewall egress rules"
fi

# Port 5000 (App API)
if ss -tlnp | grep -q ":${APP_PORT} "; then
  PROC=$(ss -tlnp | grep ":${APP_PORT} " | awk '{print $NF}' | head -1)
  fail "Port $APP_PORT already in use: $PROC — stop the process before installing"
else
  ok "Port $APP_PORT: free"
fi

# Port 80
if ss -tlnp | grep -q ":${CADDY_HTTP_PORT} "; then
  PROC=$(ss -tlnp | grep ":${CADDY_HTTP_PORT} " | awk '{print $NF}' | head -1)
  warn "Port 80 already in use: $PROC — Caddy/nginx won't start unless you free this port"
else
  ok "Port 80: free"
fi

# Port 443
if ss -tlnp | grep -q ":${CADDY_HTTPS_PORT} "; then
  PROC=$(ss -tlnp | grep ":${CADDY_HTTPS_PORT} " | awk '{print $NF}' | head -1)
  warn "Port 443 already in use: $PROC — HTTPS via Caddy won't work unless you free this port"
else
  ok "Port 443: free"
fi

# =============================================================================
section "4. Docker"
# =============================================================================

# docker binary
if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
  # Require Docker >= 24
  DOCKER_MAJOR=$(echo "$DOCKER_VER" | cut -d. -f1)
  if [[ $DOCKER_MAJOR -ge 24 ]]; then
    ok "Docker: $DOCKER_VER"
  else
    warn "Docker: $DOCKER_VER — recommend >= 24.x"
  fi
else
  fail "Docker: not installed"
  if [[ $FIX_MODE -eq 1 ]]; then
    info "Installing Docker (official script)..."
    curl -fsSL https://get.docker.com | bash
    ok "Docker installed"
  else
    info "Fix: curl -fsSL https://get.docker.com | sudo bash"
  fi
fi

# Docker daemon running
if docker info &>/dev/null; then
  ok "Docker daemon: running"
else
  fail "Docker daemon: not running"
  if [[ $FIX_MODE -eq 1 ]]; then
    systemctl enable --now docker
    ok "Docker daemon started"
  else
    info "Fix: sudo systemctl enable --now docker"
  fi
fi

# Docker Compose plugin
if docker compose version &>/dev/null; then
  COMPOSE_VER=$(docker compose version | grep -oP '\d+\.\d+\.\d+' | head -1)
  ok "Docker Compose plugin: $COMPOSE_VER"
elif command -v docker-compose &>/dev/null; then
  warn "docker-compose (standalone) found — recommend the Compose plugin instead: sudo apt install docker-compose-plugin"
else
  fail "Docker Compose: not installed"
  if [[ $FIX_MODE -eq 1 ]]; then
    apt-get install -y docker-compose-plugin
    ok "Docker Compose plugin installed"
  else
    info "Fix: sudo apt-get install -y docker-compose-plugin"
  fi
fi

# User in docker group (non-root check)
if id -nG "${SUDO_USER:-}" 2>/dev/null | grep -qw docker; then
  ok "User '${SUDO_USER:-root}' is in the docker group"
else
  if [[ -n "${SUDO_USER:-}" ]]; then
    warn "User '$SUDO_USER' is NOT in the docker group — docker commands will require sudo"
    if [[ $FIX_MODE -eq 1 ]]; then
      usermod -aG docker "$SUDO_USER"
      info "Added $SUDO_USER to docker group — re-login to apply"
    else
      info "Fix: sudo usermod -aG docker $SUDO_USER  (then re-login)"
    fi
  fi
fi

# =============================================================================
section "5. Nginx / Caddy (web server)"
# =============================================================================

# We use Caddy in docker-compose — check if HOST nginx is conflicting
if systemctl is-active --quiet nginx 2>/dev/null; then
  warn "nginx is running on host — it may conflict on port 80/443 with Caddy container"
  info "If using Caddy via Docker Compose: sudo systemctl stop nginx && sudo systemctl disable nginx"
elif command -v nginx &>/dev/null; then
  ok "nginx: installed but not running (no conflict)"
else
  ok "nginx: not installed on host (Caddy runs in Docker container — OK)"
fi

if systemctl is-active --quiet apache2 2>/dev/null; then
  warn "apache2 is running on host — will conflict on port 80"
  info "Fix: sudo systemctl stop apache2 && sudo systemctl disable apache2"
else
  ok "apache2: not running"
fi

# =============================================================================
section "6. Required System Packages"
# =============================================================================

REQUIRED_PKGS=(curl wget git ca-certificates gnupg lsb-release)
for pkg in "${REQUIRED_PKGS[@]}"; do
  if dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
    ok "Package '$pkg': installed"
  else
    fail "Package '$pkg': NOT installed"
    if [[ $FIX_MODE -eq 1 ]]; then
      apt-get install -y "$pkg"
      ok "Installed $pkg"
    else
      info "Fix: sudo apt-get install -y $pkg"
    fi
  fi
done

# Optional but helpful
OPT_PKGS=(htop jq unzip)
for pkg in "${OPT_PKGS[@]}"; do
  if dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
    ok "Package '$pkg': installed (optional)"
  else
    info "Optional package '$pkg' not installed (sudo apt-get install -y $pkg)"
  fi
done

# =============================================================================
section "7. Directory Structure"
# =============================================================================

# /srv/foodbot
if [[ -d "$DEPLOY_DIR" ]]; then
  ok "Deploy dir $DEPLOY_DIR: exists"
  # Check permissions
  OWNER=$(stat -c '%U' "$DEPLOY_DIR")
  ok "  Owner: $OWNER"
else
  fail "Deploy dir $DEPLOY_DIR: does not exist"
  if [[ $FIX_MODE -eq 1 ]]; then
    mkdir -p "$DATA_DIR"
    [[ -n "${SUDO_USER:-}" ]] && chown -R "$SUDO_USER:$SUDO_USER" "$DEPLOY_DIR"
    ok "Created $DEPLOY_DIR"
  else
    info "Fix: sudo mkdir -p $DATA_DIR && sudo chown -R \$USER:\$USER $DEPLOY_DIR"
  fi
fi

# /srv/foodbot/data (SQLite volume mount point)
if [[ -d "$DATA_DIR" ]]; then
  ok "Data dir $DATA_DIR: exists"
  # Writeable?
  if [[ -w "$DATA_DIR" ]]; then
    ok "  Writable: yes"
  else
    fail "  Writable: NO — Docker volume mount will fail"
    if [[ $FIX_MODE -eq 1 ]]; then
      [[ -n "${SUDO_USER:-}" ]] && chown -R "$SUDO_USER:$SUDO_USER" "$DATA_DIR" || chmod 777 "$DATA_DIR"
      ok "Fixed permissions on $DATA_DIR"
    else
      info "Fix: sudo chown -R \$USER:\$USER $DATA_DIR"
    fi
  fi
else
  warn "Data dir $DATA_DIR: does not exist (will be created on first deploy)"
fi

# =============================================================================
section "8. Environment File"
# =============================================================================

ENV_FILE="$DEPLOY_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  ok ".env file found: $ENV_FILE"
  # Check TELEGRAM_BOT_TOKEN is set and non-empty
  if grep -qE '^TELEGRAM_BOT_TOKEN=.+' "$ENV_FILE"; then
    TOKEN_VAL=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
    # Check it looks like a real token (digits:alphanum)
    if echo "$TOKEN_VAL" | grep -qE '^[0-9]+:[A-Za-z0-9_-]{35,}$'; then
      ok "  TELEGRAM_BOT_TOKEN: set (format looks valid)"
    else
      warn "  TELEGRAM_BOT_TOKEN: set but format looks wrong (expected: 123456:ABC...)"
    fi
  else
    fail "  TELEGRAM_BOT_TOKEN: not set in .env — bot will not start"
    info "  Edit $ENV_FILE and add: TELEGRAM_BOT_TOKEN=your_token_here"
  fi
  # Check API_BASE_URL
  if grep -qE '^API_BASE_URL=.+' "$ENV_FILE"; then
    ok "  API_BASE_URL: set"
  else
    warn "  API_BASE_URL: not set — will default to http://api:5000 (OK for docker-compose)"
  fi
else
  fail ".env file not found at $ENV_FILE"
  if [[ -f "$DEPLOY_DIR/.env.example" ]]; then
    info "Fix: cp $DEPLOY_DIR/.env.example $ENV_FILE && nano $ENV_FILE"
  else
    info "Fix: create $ENV_FILE with TELEGRAM_BOT_TOKEN=<your_token>"
  fi
fi

# =============================================================================
section "9. Firewall"
# =============================================================================

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status | head -1)
  log "  ufw status: $UFW_STATUS"
  if echo "$UFW_STATUS" | grep -q "inactive"; then
    warn "ufw is inactive — firewall disabled. Consider enabling after setup."
  else
    ok "ufw: active"
    # Check required rules
    for port in 22 80 443 5000; do
      if ufw status | grep -qE "^${port}(/tcp)?\s+ALLOW"; then
        ok "  Port $port: allowed in ufw"
      else
        warn "  Port $port: no explicit ufw rule (may be blocked)"
        info "  Fix: sudo ufw allow $port/tcp"
      fi
    done
  fi
else
  warn "ufw: not installed — no firewall management available"
  info "Install: sudo apt-get install -y ufw"
fi

# iptables fallback info
if command -v iptables &>/dev/null; then
  BLOCKED=$(iptables -L INPUT -n 2>/dev/null | grep -cE "^DROP|^REJECT" || true)
  if [[ $BLOCKED -gt 0 ]]; then
    warn "iptables has $BLOCKED DROP/REJECT rules — verify ports 80, 443, 5000 are not blocked"
  else
    ok "iptables: no DROP/REJECT rules in INPUT chain"
  fi
fi

# =============================================================================
section "10. Docker Image Pull Test"
# =============================================================================

# Quick pull check for base images we use
for image in "node:20-slim" "python:3.12-slim"; do
  info "Pulling $image (may take a moment)..."
  if docker pull "$image" --quiet &>/dev/null; then
    ok "Image $image: pull successful"
  else
    fail "Image $image: pull FAILED — check internet / Docker Hub access"
  fi
done

# =============================================================================
section "11. Telegram Bot Token Validation"
# =============================================================================

if [[ -f "$ENV_FILE" ]]; then
  TOKEN_VAL=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$TOKEN_VAL" && "$TOKEN_VAL" != "your_bot_token_here" ]]; then
    TG_RESP=$(curl -fsSL --max-time 10 "https://api.telegram.org/bot${TOKEN_VAL}/getMe" 2>/dev/null || echo '{}')
    if echo "$TG_RESP" | grep -q '"ok":true'; then
      BOT_NAME=$(echo "$TG_RESP" | grep -oP '"username":"\K[^"]+')
      ok "Telegram bot token: valid (bot = @$BOT_NAME)"
    else
      fail "Telegram bot token: INVALID — API returned error"
      info "Check your token at @BotFather"
    fi
  else
    warn "Telegram bot token: placeholder value — skipping live validation"
  fi
else
  warn "Skipping Telegram token validation (.env not found)"
fi

# =============================================================================
# Summary
# =============================================================================
log ""
log "${BOLD}━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  log "  ${GREEN}${BOLD}All checks passed — server is ready for installation!${RESET}"
elif [[ $ERRORS -eq 0 ]]; then
  log "  ${YELLOW}${BOLD}No blockers, but $WARNINGS warning(s) — review above.${RESET}"
  log "  ${YELLOW}Proceed with caution.${RESET}"
else
  log "  ${RED}${BOLD}$ERRORS error(s), $WARNINGS warning(s) — fix errors before installing.${RESET}"
  log ""
  log "  ${CYAN}Run with --fix to auto-fix common issues:${RESET}"
  log "  ${BOLD}sudo bash preflight-check.sh --fix${RESET}"
fi

log ""
log "  Full log saved to: $LOG_FILE"
log ""

# Exit non-zero if errors exist
[[ $ERRORS -eq 0 ]]
