#!/usr/bin/env bash
# =============================================================================
#  preflight-check.sh — Food Diary V2 pre-install readiness check
#  Target: Ubuntu 24.04 LTS
#  Usage:  sudo bash preflight-check.sh [--fix]
# =============================================================================
set -euo pipefail

# ── Colors & symbols ──────────────────────────────────────────────────────────
R='\033[0;31m'  G='\033[0;32m'  Y='\033[1;33m'  C='\033[0;36m'
B='\033[0;34m'  M='\033[0;35m'  W='\033[1;37m'  DIM='\033[2m'
BOLD='\033[1m'  RST='\033[0m'
BG_GRN='\033[42m'  BG_RED='\033[41m'  BG_YEL='\033[43m'

TICK="${G}✔${RST}"
CROSS="${R}✘${RST}"
WARN_SYM="${Y}!${RST}"
ARROW="${C}›${RST}"
DOT="${DIM}·${RST}"

# ── State ─────────────────────────────────────────────────────────────────────
ERRORS=0
WARNINGS=0
FIX_MODE=0
LOG_FILE="/tmp/food_diary_preflight_$(date +%Y%m%d_%H%M%S).log"
declare -a SUMMARY_LINES=()

[[ "${1:-}" == "--fix" ]] && FIX_MODE=1

# ── Minimum requirements ──────────────────────────────────────────────────────
REQ_RAM_MB=1024
REQ_DISK_GB=5
APP_PORT=5000
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
DEPLOY_DIR="/srv/foodbot"
DATA_DIR="/srv/foodbot/data"

# ── Output helpers ────────────────────────────────────────────────────────────
_raw()  { echo -e "$*" | tee -a "$LOG_FILE"; }
ok()    { _raw "  ${TICK}  ${W}$1${RST}${2:+  ${DIM}$2${RST}}"; SUMMARY_LINES+=("OK|$1"); }
fail()  { _raw "  ${CROSS}  ${R}${BOLD}$1${RST}${2:+  ${DIM}$2${RST}}"; ((ERRORS++)) || true; SUMMARY_LINES+=("FAIL|$1"); }
warn()  { _raw "  ${WARN_SYM}  ${Y}$1${RST}${2:+  ${DIM}$2${RST}}"; ((WARNINGS++)) || true; SUMMARY_LINES+=("WARN|$1"); }
info()  { _raw "     ${ARROW} ${DIM}$*${RST}"; }
skip()  { _raw "  ${DOT}  ${DIM}$*${RST}"; }

section() {
  local num="$1"; shift
  _raw ""
  _raw "  ${BOLD}${C}[$num]${RST} ${BOLD}$*${RST}"
  _raw "  ${DIM}$(printf '─%.0s' {1..54})${RST}"
}

# ── Header ────────────────────────────────────────────────────────────────────
clear
_raw ""
_raw "  ${BOLD}${C}╔══════════════════════════════════════════════════════╗${RST}"
_raw "  ${BOLD}${C}║${RST}  ${W}${BOLD}🥗  Food Diary V2 — Pre-install Readiness Check${RST}  ${C}${BOLD}║${RST}"
_raw "  ${BOLD}${C}╠══════════════════════════════════════════════════════╣${RST}"
_raw "  ${BOLD}${C}║${RST}  ${DIM}Server:  $(hostname -f 2>/dev/null || hostname)${RST}"
_raw "  ${BOLD}${C}║${RST}  ${DIM}Date:    $(date '+%Y-%m-%d %H:%M:%S %Z')${RST}"
_raw "  ${BOLD}${C}║${RST}  ${DIM}Log:     $LOG_FILE${RST}"
_raw "  ${BOLD}${C}║${RST}  ${DIM}Fix mode: $([ $FIX_MODE -eq 1 ] && echo "${G}ON (--fix)${RST}" || echo "OFF")${RST}"
_raw "  ${BOLD}${C}╚══════════════════════════════════════════════════════╝${RST}"

# =============================================================================
section "1" "OS & Privileges"
# =============================================================================

# Root
if [[ $EUID -eq 0 ]]; then
  ok "Running as root"
else
  fail "Must run as root" "re-run: sudo bash $0"
fi

# OS
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  if [[ "$ID" == "ubuntu" && ( "$VERSION_ID" == "24.04" || "$VERSION_ID" == "22.04" ) ]]; then
    ok "OS: $NAME $VERSION_ID" "supported"
  elif [[ "$ID" == "ubuntu" ]]; then
    warn "OS: $NAME $VERSION_ID" "tested on 22.04/24.04 only"
  else
    warn "OS: $NAME $VERSION_ID" "not Ubuntu — proceed with caution"
  fi
else
  fail "Cannot determine OS" "/etc/os-release missing"
fi

# systemd
if systemctl --version &>/dev/null; then
  ok "systemd present"
else
  fail "systemd not found" "required for Docker daemon"
fi

# =============================================================================
section "2" "Hardware Resources"
# =============================================================================

RAM_MB=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
if [[ $RAM_MB -ge $REQ_RAM_MB ]]; then
  ok "RAM: ${RAM_MB} MB" ">= ${REQ_RAM_MB} MB required"
else
  fail "RAM: ${RAM_MB} MB" "minimum ${REQ_RAM_MB} MB required"
fi

DISK_FREE_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
if [[ $DISK_FREE_GB -ge $REQ_DISK_GB ]]; then
  ok "Free disk: ${DISK_FREE_GB} GB" ">= ${REQ_DISK_GB} GB required"
else
  fail "Free disk: ${DISK_FREE_GB} GB" "minimum ${REQ_DISK_GB} GB required"
fi

ok "CPU cores: $(nproc)"

# =============================================================================
section "3" "Network & Connectivity"
# =============================================================================

# Internet
if curl -fsSL --max-time 10 --head https://hub.docker.com/ &>/dev/null; then
  ok "Internet → Docker Hub" "hub.docker.com reachable"
else
  fail "Internet → Docker Hub" "hub.docker.com unreachable — check DNS or outbound HTTP/S"
fi

# DNS
if getent hosts github.com &>/dev/null; then
  ok "DNS resolution" "github.com resolves"
else
  fail "DNS resolution failed" "getent hosts github.com"
fi

# Telegram API
if curl -fsSL --max-time 10 https://api.telegram.org &>/dev/null; then
  ok "Telegram API" "api.telegram.org reachable"
else
  warn "Telegram API unreachable" "check firewall egress rules — bot won't work"
fi

# Ports
for port_entry in "$APP_PORT:App API" "$CADDY_HTTP_PORT:HTTP (Caddy)" "$CADDY_HTTPS_PORT:HTTPS (Caddy)"; do
  port="${port_entry%%:*}"; label="${port_entry##*:}"
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    PROC=$(ss -tlnp 2>/dev/null | grep ":${port} " | awk '{print $NF}' | head -1)
    if [[ $port -eq $APP_PORT ]]; then
      fail "Port $port ($label): IN USE" "$PROC"
    else
      warn "Port $port ($label): in use" "$PROC — Caddy container won't bind"
    fi
  else
    ok "Port $port ($label): free"
  fi
done

# =============================================================================
section "4" "Docker"
# =============================================================================

if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
  DOCKER_MAJOR=$(echo "$DOCKER_VER" | cut -d. -f1)
  if [[ $DOCKER_MAJOR -ge 24 ]]; then
    ok "Docker: $DOCKER_VER"
  else
    warn "Docker: $DOCKER_VER" "recommend >= 24.x"
  fi
else
  fail "Docker: not installed"
  if [[ $FIX_MODE -eq 1 ]]; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | bash
    ok "Docker installed"
  else
    info "Fix: curl -fsSL https://get.docker.com | sudo bash"
  fi
fi

if docker info &>/dev/null; then
  ok "Docker daemon: running"
else
  fail "Docker daemon: not running"
  if [[ $FIX_MODE -eq 1 ]]; then
    systemctl enable --now docker && ok "Docker daemon started"
  else
    info "Fix: sudo systemctl enable --now docker"
  fi
fi

if docker compose version &>/dev/null; then
  COMPOSE_VER=$(docker compose version | grep -oP '\d+\.\d+\.\d+' | head -1)
  ok "Docker Compose plugin: $COMPOSE_VER"
elif command -v docker-compose &>/dev/null; then
  warn "docker-compose standalone found" "use plugin instead: apt install docker-compose-plugin"
else
  fail "Docker Compose: not installed"
  if [[ $FIX_MODE -eq 1 ]]; then
    apt-get install -y docker-compose-plugin && ok "Compose plugin installed"
  else
    info "Fix: sudo apt-get install -y docker-compose-plugin"
  fi
fi

if [[ -n "${SUDO_USER:-}" ]]; then
  if id -nG "$SUDO_USER" 2>/dev/null | grep -qw docker; then
    ok "User '$SUDO_USER' in docker group"
  else
    warn "User '$SUDO_USER' NOT in docker group" "docker commands will need sudo"
    if [[ $FIX_MODE -eq 1 ]]; then
      usermod -aG docker "$SUDO_USER"
      info "Added $SUDO_USER to docker group — re-login to apply"
    else
      info "Fix: sudo usermod -aG docker $SUDO_USER"
    fi
  fi
fi

# =============================================================================
section "5" "Web Server Conflicts"
# =============================================================================

for svc in nginx apache2; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    warn "Host $svc: running" "will conflict on port 80 — disable before install"
    info "Fix: sudo systemctl stop $svc && sudo systemctl disable $svc"
  elif command -v "$svc" &>/dev/null; then
    ok "Host $svc: installed but stopped" "no conflict"
  else
    ok "Host $svc: not installed" "no conflict (Caddy runs in Docker)"
  fi
done

# =============================================================================
section "6" "Required System Packages"
# =============================================================================

REQUIRED_PKGS=(curl wget git ca-certificates gnupg lsb-release)
MISSING_PKGS=()
for pkg in "${REQUIRED_PKGS[@]}"; do
  if dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
    ok "Package: $pkg"
  else
    fail "Package: $pkg" "not installed"
    MISSING_PKGS+=("$pkg")
  fi
done

if [[ ${#MISSING_PKGS[@]} -gt 0 && $FIX_MODE -eq 1 ]]; then
  apt-get install -y "${MISSING_PKGS[@]}" && ok "Installed: ${MISSING_PKGS[*]}"
elif [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
  info "Fix: sudo apt-get install -y ${MISSING_PKGS[*]}"
fi

OPT_PKGS=(htop jq unzip)
for pkg in "${OPT_PKGS[@]}"; do
  if dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
    skip "Optional: $pkg (installed)"
  else
    skip "Optional: $pkg (not installed)"
  fi
done

# =============================================================================
section "7" "Directory Structure"
# =============================================================================

if [[ -d "$DEPLOY_DIR" ]]; then
  ok "Deploy dir: $DEPLOY_DIR" "exists"
  OWNER=$(stat -c '%U' "$DEPLOY_DIR")
  ok "  Owner: $OWNER"
else
  fail "Deploy dir: $DEPLOY_DIR" "does not exist"
  if [[ $FIX_MODE -eq 1 ]]; then
    mkdir -p "$DATA_DIR"
    [[ -n "${SUDO_USER:-}" ]] && chown -R "$SUDO_USER:$SUDO_USER" "$DEPLOY_DIR"
    ok "Created $DEPLOY_DIR"
  else
    info "Fix: sudo mkdir -p $DATA_DIR && sudo chown -R \$USER:\$USER $DEPLOY_DIR"
  fi
fi

if [[ -d "$DATA_DIR" ]]; then
  if [[ -w "$DATA_DIR" ]]; then
    ok "Data dir: $DATA_DIR" "writable"
  else
    fail "Data dir: $DATA_DIR" "NOT writable — SQLite volume mount will fail"
    [[ $FIX_MODE -eq 1 ]] && chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$DATA_DIR" && ok "Fixed permissions"
  fi
else
  warn "Data dir: $DATA_DIR" "missing — will be created on first deploy"
fi

# =============================================================================
section "8" "Environment File (.env)"
# =============================================================================

ENV_FILE="$DEPLOY_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  ok ".env: found at $ENV_FILE"
  # JWT_SECRET
  JWT_VAL=$(grep '^JWT_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$JWT_VAL" && "$JWT_VAL" != *"CHANGE_ME"* ]]; then
    if [[ ${#JWT_VAL} -ge 32 ]]; then
      ok "  JWT_SECRET" "set, length OK (${#JWT_VAL} chars)"
    else
      warn "  JWT_SECRET" "set but too short (${#JWT_VAL} chars — recommend >= 32)"
    fi
  else
    fail "  JWT_SECRET" "not set or placeholder — sessions will be insecure"
    info "Generate: openssl rand -hex 32"
  fi

  # ENCRYPTION_KEY
  ENC_VAL=$(grep '^ENCRYPTION_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$ENC_VAL" && "$ENC_VAL" != *"CHANGE_ME"* ]]; then
    ok "  ENCRYPTION_KEY" "set, length OK (${#ENC_VAL} chars)"
  else
    fail "  ENCRYPTION_KEY" "not set or placeholder — secrets in DB will be unencryptable"
    info "Generate: openssl rand -hex 32"
  fi
else
  fail ".env not found" "$ENV_FILE"
  if [[ -f "$DEPLOY_DIR/.env.example" ]]; then
    info "Fix: cp $DEPLOY_DIR/.env.example $ENV_FILE && nano $ENV_FILE"
  else
    info "Create $ENV_FILE with TELEGRAM_BOT_TOKEN=<token>"
  fi
fi

# =============================================================================
section "9" "Firewall (ufw)"
# =============================================================================

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status | head -1)
  if echo "$UFW_STATUS" | grep -q "inactive"; then
    warn "ufw: inactive" "firewall disabled — consider enabling after setup"
  else
    ok "ufw: active"
    for port in 22 80 443 5000; do
      if ufw status | grep -qE "^${port}(/tcp)?\s+ALLOW"; then
        ok "  ufw: port $port ALLOW"
      else
        warn "  ufw: port $port" "no explicit ALLOW rule"
        info "Fix: sudo ufw allow $port/tcp"
      fi
    done
  fi
else
  warn "ufw: not installed" "no firewall management"
fi

if command -v iptables &>/dev/null; then
  BLOCKED=$(iptables -L INPUT -n 2>/dev/null | grep -cE "^DROP|^REJECT" || true)
  if [[ $BLOCKED -gt 0 ]]; then
    warn "iptables: $BLOCKED DROP/REJECT rules in INPUT" "verify ports 80/443/5000 not blocked"
  else
    ok "iptables: no DROP/REJECT in INPUT chain"
  fi
fi

# =============================================================================
section "10" "Docker Image Pull Test"
# =============================================================================

for image in "node:20-slim" "python:3.12-slim"; do
  skip "Pulling $image..."
  if docker pull "$image" --quiet &>/dev/null; then
    ok "Image: $image" "pull OK"
  else
    fail "Image: $image" "pull FAILED — check Docker Hub access"
  fi
done

# =============================================================================
section "11" "API Health Check"
# =============================================================================

API_URL="http://localhost:${APP_PORT:-3000}/api/auth/me"
skip "Calling $API_URL ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "401" || "$HTTP_CODE" == "200" ]]; then
  ok "API health: responding" "HTTP $HTTP_CODE (server is up)"
elif [[ "$HTTP_CODE" == "000" ]]; then
  warn "API health: not reachable" "server may not be running yet — start after deploy"
else
  warn "API health: unexpected status" "HTTP $HTTP_CODE"
fi

# =============================================================================
# ── Final Summary Panel ───────────────────────────────────────────────────────
# =============================================================================
_raw ""
_raw "  ${BOLD}${C}╔══════════════════════════════════════════════════════╗${RST}"
_raw "  ${BOLD}${C}║${RST}  ${BOLD}${W}SUMMARY${RST}                                              ${C}${BOLD}║${RST}"
_raw "  ${BOLD}${C}╠══════════════════════════════════════════════════════╣${RST}"

OK_COUNT=0; FAIL_COUNT=0; WARN_COUNT=0
for line in "${SUMMARY_LINES[@]}"; do
  status="${line%%|*}"; label="${line##*|}"
  case "$status" in
    OK)   ((OK_COUNT++))   || true ;;
    FAIL) ((FAIL_COUNT++)) || true ;;
    WARN) ((WARN_COUNT++)) || true ;;
  esac
done

_raw "  ${BOLD}${C}║${RST}  ${TICK} Passed    ${BOLD}${G}${OK_COUNT}${RST} checks"
_raw "  ${BOLD}${C}║${RST}  ${WARN_SYM} Warnings  ${BOLD}${Y}${WARN_COUNT}${RST} checks"
_raw "  ${BOLD}${C}║${RST}  ${CROSS} Failed    ${BOLD}${R}${FAIL_COUNT}${RST} checks"
_raw "  ${BOLD}${C}╠══════════════════════════════════════════════════════╣${RST}"

# Failed items list
if [[ $FAIL_COUNT -gt 0 ]]; then
  _raw "  ${BOLD}${C}║${RST}  ${R}${BOLD}Blockers to fix:${RST}"
  for line in "${SUMMARY_LINES[@]}"; do
    status="${line%%|*}"; label="${line##*|}"
    [[ "$status" == "FAIL" ]] && _raw "  ${BOLD}${C}║${RST}    ${CROSS} ${R}${label}${RST}"
  done
  _raw "  ${BOLD}${C}║${RST}"
fi

# Verdict
_raw "  ${BOLD}${C}║${RST}  Verdict: $(
  if [[ $FAIL_COUNT -eq 0 && $WARN_COUNT -eq 0 ]]; then
    echo "${BG_GRN}${BOLD}  ✔ READY TO DEPLOY  ${RST}"
  elif [[ $FAIL_COUNT -eq 0 ]]; then
    echo "${BG_YEL}\033[30m${BOLD}  ⚠ READY (with warnings)  ${RST}"
  else
    echo "${BG_RED}${BOLD}  ✘ NOT READY — fix errors first  ${RST}"
  fi
)"

_raw "  ${BOLD}${C}╠══════════════════════════════════════════════════════╣${RST}"

if [[ $FAIL_COUNT -gt 0 ]]; then
  _raw "  ${BOLD}${C}║${RST}  ${DIM}Re-run with --fix to auto-fix common issues:${RST}"
  _raw "  ${BOLD}${C}║${RST}  ${BOLD}  sudo bash preflight-check.sh --fix${RST}"
  _raw "  ${BOLD}${C}║${RST}"
fi

_raw "  ${BOLD}${C}║${RST}  ${DIM}Full log: $LOG_FILE${RST}"
_raw "  ${BOLD}${C}╚══════════════════════════════════════════════════════╝${RST}"
_raw ""

[[ $ERRORS -eq 0 ]]
