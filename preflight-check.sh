#!/usr/bin/env bash
# =============================================================================
#  preflight-check.sh — Food Diary V2 pre-install readiness check
#  Target: Ubuntu 22.04 / 24.04 LTS
#  Usage:  Run from the project directory (where docker-compose.yml lives)
#          sudo bash preflight-check.sh [--fix]
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
# Derive paths from CWD — script must be run from the project directory
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${DEPLOY_DIR}/data"

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
_raw "  ${BOLD}${C}║${RST}  ${DIM}Dir:     $DEPLOY_DIR${RST}"
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

# ── Port checks ──────────────────────────────────────────────────────────────
# Detect whether a host web server is running and already proxying to us.
# If nginx/apache handles 80/443 and proxy_passes to APP_PORT — that is OK:
# it means the integration mode is in use (no Caddy needed).
HOST_WEB_SERVER=""   # will be set to "nginx" or "apache2" if found running
HOST_WEB_PROXYING=0  # 1 if the web server already routes to APP_PORT

for svc in nginx apache2; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    HOST_WEB_SERVER="$svc"
    break
  fi
done

# Check if the running web server has a proxy_pass / ProxyPass to our APP_PORT
if [[ -n "$HOST_WEB_SERVER" ]]; then
  if grep -rqE "proxy_pass[[:space:]]+http://localhost:${APP_PORT}|proxy_pass[[:space:]]+http://127\.0\.0\.1:${APP_PORT}|ProxyPass[[:space:]]+[^[:space:]]+[[:space:]]+http://localhost:${APP_PORT}|ProxyPass[[:space:]]+[^[:space:]]+[[:space:]]+http://127\.0\.0\.1:${APP_PORT}" \
       /etc/nginx /etc/apache2 2>/dev/null; then
    HOST_WEB_PROXYING=1
  fi
fi

# APP_PORT — should NOT be published on host when using Caddy.
# But if using nginx/apache integration, it just needs to be free for Docker internal use.
if ss -tlnp 2>/dev/null | grep -q ":${APP_PORT} "; then
  PROC=$(ss -tlnp 2>/dev/null | grep ":${APP_PORT} " | awk '{print $NF}' | head -1)
  warn "Port $APP_PORT (App API): in use on host" "$PROC — API should only be accessible inside Docker network"
else
  ok "Port $APP_PORT (App API): free" "will be used internally by Docker"
fi

# Ports 80 and 443 — only warn if in use AND not by a web server we can integrate with
for port_entry in "$CADDY_HTTP_PORT:HTTP" "$CADDY_HTTPS_PORT:HTTPS"; do
  port="${port_entry%%:*}"; label="${port_entry##*:}"
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    PROC=$(ss -tlnp 2>/dev/null | grep ":${port} " | awk '{print $NF}' | head -1)
    if [[ -n "$HOST_WEB_SERVER" ]]; then
      # nginx or apache is running — this is integration mode, not a conflict
      ok "Port $port ($label): in use by $HOST_WEB_SERVER" "integration mode — Caddy not needed (see section [5])"
    else
      warn "Port $port ($label): in use" "$PROC — if using Caddy container, it won't bind this port"
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
section "5" "Web Server Integration"
# =============================================================================
# Strategy: if nginx or apache2 is running, we INTEGRATE (add a new vhost)
# rather than removing the existing server. Multiple apps share 443 via SNI.
# =============================================================================

# Resolve DOMAIN for config generation (read from .env or use default)
_DOMAIN="fooddiary.razbudimir.com"
if [[ -f "${DEPLOY_DIR}/.env" ]]; then
  _D=$(grep '^DOMAIN=' "${DEPLOY_DIR}/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  [[ -n "$_D" ]] && _DOMAIN="$_D"
fi
_PORT="${APP_PORT:-5000}"

_nginx_conf() {
  echo "server {"
  echo "    listen 80;"
  echo "    server_name ${_DOMAIN};"
  echo "    return 301 https://\$host\$request_uri;"
  echo "}"
  echo ""
  echo "server {"
  echo "    listen 443 ssl;"
  echo "    server_name ${_DOMAIN};"
  echo ""
  echo "    ssl_certificate     /path/to/fullchain.pem;  # <- замени на реальный путь"
  echo "    ssl_certificate_key /path/to/privkey.pem;    # <- замени на реальный путь"
  echo ""
  echo "    ssl_protocols       TLSv1.2 TLSv1.3;"
  echo "    ssl_ciphers         HIGH:!aNULL:!MD5;"
  echo ""
  echo "    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;"
  echo ""
  echo "    location / {"
  echo "        proxy_pass         http://127.0.0.1:${_PORT};"
  echo "        proxy_http_version 1.1;"
  echo "        proxy_set_header   Upgrade \$http_upgrade;"
  echo "        proxy_set_header   Connection keep-alive;"
  echo "        proxy_set_header   Host \$host;"
  echo "        proxy_set_header   X-Real-IP \$remote_addr;"
  echo "        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;"
  echo "        proxy_set_header   X-Forwarded-Proto \$scheme;"
  echo "        proxy_cache_bypass \$http_upgrade;"
  echo "    }"
  echo "}"
}

_apache_conf() {
  echo "<VirtualHost *:80>"
  echo "    ServerName ${_DOMAIN}"
  echo "    Redirect permanent / https://${_DOMAIN}/"
  echo "</VirtualHost>"
  echo ""
  echo "<VirtualHost *:443>"
  echo "    ServerName ${_DOMAIN}"
  echo ""
  echo "    SSLEngine on"
  echo "    SSLCertificateFile    /path/to/fullchain.pem  # <- замени на реальный путь"
  echo "    SSLCertificateKeyFile /path/to/privkey.pem    # <- замени на реальный путь"
  echo ""
  echo "    ProxyPreserveHost On"
  echo "    ProxyPass        / http://127.0.0.1:${_PORT}/"
  echo "    ProxyPassReverse / http://127.0.0.1:${_PORT}/"
  echo ""
  echo "    Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains\""
  echo "</VirtualHost>"
}

if systemctl is-active --quiet nginx 2>/dev/null; then
  ok  "Host nginx: running" "integration mode — add new vhost, do NOT stop nginx"
  if [[ $HOST_WEB_PROXYING -eq 1 ]]; then
    ok  "  nginx already proxies to :${_PORT}" "vhost config found — looks good"
  else
    warn "  nginx vhost for ${_DOMAIN} not found" "create /etc/nginx/sites-available/fooddiary.conf"
    _raw ""
    _raw "  ${Y}┌── Готовый nginx-конфиг ──────────────────────────────────────────────${RST}"
    while IFS= read -r line; do
      _raw "  ${DIM}│ ${line}${RST}"
    done < <(_nginx_conf)
    _raw "  ${Y}└── Команды для активации ──────────────────────────────────────────────${RST}"
    info "sudo nano /etc/nginx/sites-available/fooddiary.conf  # вставь конфиг выше"
    info "sudo ln -s /etc/nginx/sites-available/fooddiary.conf /etc/nginx/sites-enabled/"
    info "sudo nginx -t && sudo systemctl reload nginx"
    _raw ""
    info "В docker-compose.yml: убери сервис caddy (nginx берёт TLS на себя)"
    info "Добавь в docker-compose.yml публикацию: ports: ['127.0.0.1:${_PORT}:${_PORT}']"
  fi
elif command -v nginx &>/dev/null; then
  ok "Host nginx: installed but stopped" "no conflict — Caddy (Docker) will handle TLS"
else
  ok "Host nginx: not installed" "Caddy (Docker) will handle port 80/443"
fi

if systemctl is-active --quiet apache2 2>/dev/null; then
  ok  "Host apache2: running" "integration mode — add new vhost, do NOT stop apache2"
  if [[ $HOST_WEB_PROXYING -eq 1 ]]; then
    ok  "  apache2 already proxies to :${_PORT}" "vhost config found — looks good"
  else
    warn "  apache2 vhost for ${_DOMAIN} not found" "create /etc/apache2/sites-available/fooddiary.conf"
    _raw ""
    _raw "  ${Y}┌── Готовый apache2-конфиг ────────────────────────────────────────────${RST}"
    while IFS= read -r line; do
      _raw "  ${DIM}│ ${line}${RST}"
    done < <(_apache_conf)
    _raw "  ${Y}└── Команды для активации ──────────────────────────────────────────────${RST}"
    info "sudo a2enmod proxy proxy_http ssl headers"
    info "sudo nano /etc/apache2/sites-available/fooddiary.conf  # вставь конфиг выше"
    info "sudo a2ensite fooddiary && sudo systemctl reload apache2"
    _raw ""
    info "В docker-compose.yml: убери сервис caddy, добавь ports: ['127.0.0.1:${_PORT}:${_PORT}']"
  fi
elif command -v apache2 &>/dev/null; then
  ok "Host apache2: installed but stopped" "no conflict — Caddy (Docker) will handle TLS"
else
  ok "Host apache2: not installed" "no conflict"
fi



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

  # DEEPSEEK_API_KEY (optional — КБЖУ analysis feature)
  DS_VAL=$(grep '^DEEPSEEK_API_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$DS_VAL" && "$DS_VAL" != "your_deepseek_api_key_here" && "$DS_VAL" != *"CHANGE_ME"* ]]; then
    ok "  DEEPSEEK_API_KEY" "set (КБЖУ analysis enabled)"
  else
    skip "  DEEPSEEK_API_KEY not set — КБЖУ analysis button will be hidden (optional)"
  fi
else
  fail ".env not found" "$ENV_FILE"
  if [[ -f "$DEPLOY_DIR/.env.example" ]]; then
    info "Fix: cp $DEPLOY_DIR/.env.example $ENV_FILE && nano $ENV_FILE"
  else
    info "Create $ENV_FILE — see .env.example in project root"
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
    for port in 22 80 443; do
      if ufw status | grep -qE "^${port}(/tcp)?\s+ALLOW"; then
        ok "  ufw: port $port ALLOW"
      else
        warn "  ufw: port $port" "no explicit ALLOW rule"
        info "Fix: sudo bash scripts/setup-ufw-phase6.sh"
      fi
    done
    if ufw status | grep -qE "^5000(/tcp)?\s+ALLOW"; then
      warn "  ufw: port 5000 ALLOW" "Phase 6: remove — API must not be public"
      info "Fix: sudo ufw delete allow 5000/tcp"
    else
      ok "  ufw: port 5000 not exposed" "API internal via Docker network"
    fi
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

for image in "node:20-slim"; do
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
section "12" "HTTPS / Caddy (Phase 6)"
# =============================================================================

CERT_DIR="${DEPLOY_DIR}/certs"
FULLCHAIN="${CERT_DIR}/fullchain.pem"
PRIVKEY="${CERT_DIR}/privkey.pem"

if [[ -f "$FULLCHAIN" && -f "$PRIVKEY" ]]; then
  ok "TLS certs" "certs/fullchain.pem + privkey.pem present"
  if command -v openssl &>/dev/null; then
    EXPIRY=$(openssl x509 -in "$FULLCHAIN" -noout -enddate 2>/dev/null | cut -d= -f2- || true)
    [[ -n "$EXPIRY" ]] && ok "  TLS expiry" "$EXPIRY"
  fi
else
  fail "TLS certs missing" "add fullchain.pem and privkey.pem to ${CERT_DIR}/ (see certs/README.md)"
fi

# Caddy is only required when NOT using a host nginx/apache as front-end
if [[ -n "$HOST_WEB_SERVER" && "$(systemctl is-active "$HOST_WEB_SERVER" 2>/dev/null)" == "active" ]]; then
  # Host web server is running — Caddy in Docker is not needed
  if [[ -f "${DEPLOY_DIR}/docker-compose.yml" ]] && grep -qE '^\s+caddy:' "${DEPLOY_DIR}/docker-compose.yml"; then
    warn "docker-compose: caddy service defined" "but $HOST_WEB_SERVER is handling TLS — consider removing caddy service to avoid port conflict"
  else
    ok "docker-compose: no caddy service" "$HOST_WEB_SERVER handles TLS — correct for integration mode"
  fi
elif [[ -f "${DEPLOY_DIR}/docker-compose.yml" ]] && grep -qE '^\s+caddy:' "${DEPLOY_DIR}/docker-compose.yml"; then
  ok "docker-compose: caddy service defined"
else
  fail "docker-compose: caddy service missing" "add caddy service OR configure host nginx/apache as reverse proxy"
fi

DOMAIN_VAL="fooddiary.razbudimir.com"
if [[ -f "$ENV_FILE" ]]; then
  DOMAIN_VAL=$(grep '^DOMAIN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "$DOMAIN_VAL")
fi

if getent hosts "$DOMAIN_VAL" &>/dev/null; then
  RESOLVED=$(getent hosts "$DOMAIN_VAL" | awk '{print $1}' | head -1)
  ok "DNS: $DOMAIN_VAL" "resolves to $RESOLVED"
else
  warn "DNS: $DOMAIN_VAL" "does not resolve yet — add A record before public HTTPS"
fi

HTTPS_URL="https://${DOMAIN_VAL}/api/now"
skip "Calling $HTTPS_URL ..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HTTPS_URL" 2>/dev/null || echo "000")
if [[ "$HTTPS_CODE" == "200" ]]; then
  ok "HTTPS health" "HTTP $HTTPS_CODE"
  HSTS=$(curl -sI --max-time 10 "$HTTPS_URL" 2>/dev/null | grep -i strict-transport-security || true)
  if [[ -n "$HSTS" ]]; then
    ok "HSTS header" "present"
  else
    warn "HSTS header" "not found — verify Caddy is serving TLS"
  fi
elif [[ "$HTTPS_CODE" == "000" ]]; then
  skip "HTTPS health: not reachable (deploy stack or check DNS/certs)"
else
  warn "HTTPS health" "HTTP $HTTPS_CODE — expected 200 from /api/now"
fi

# =============================================================================
section "13" "Data Persistence (Phase 3)"
# =============================================================================

HOST_DATA_DIR="/srv/foodbot/data"
BACKUP_DIR="${HOST_DATA_DIR}/backups"
DB_ON_HOST="${HOST_DATA_DIR}/data.db"

if [[ -d "$HOST_DATA_DIR" ]]; then
  ok "Data directory" "$HOST_DATA_DIR exists"
  if [[ -w "$HOST_DATA_DIR" ]]; then
    ok "  Data dir writable" "container can persist SQLite"
  else
    fail "  Data dir not writable" "chown $USER $HOST_DATA_DIR"
  fi
else
  warn "Data directory missing" "mkdir -p $HOST_DATA_DIR"
  if [[ $FIX_MODE -eq 1 ]]; then
    mkdir -p "$HOST_DATA_DIR" && ok "Created $HOST_DATA_DIR"
  fi
fi

if [[ -f "$DB_ON_HOST" ]]; then
  ok "SQLite database" "data.db present on host"
  if command -v sqlite3 &>/dev/null; then
    JMODE=$(sqlite3 "$DB_ON_HOST" "PRAGMA journal_mode;" 2>/dev/null || echo "unknown")
    if [[ "$JMODE" == "wal" ]]; then
      ok "  journal_mode" "WAL (recommended)"
    else
      warn "  journal_mode" "$JMODE — restart API after Phase 3 deploy for WAL"
    fi
  fi
else
  skip "SQLite database not found yet" "created on first app start"
fi

if [[ -d "$BACKUP_DIR" ]]; then
  BCOUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name 'food-diary_*.db' 2>/dev/null | wc -l | tr -d ' ')
  ok "Backup directory" "$BACKUP_DIR ($BCOUNT backups)"
else
  warn "Backup directory missing" "mkdir -p $BACKUP_DIR"
fi

if [[ -f "${DEPLOY_DIR}/scripts/backup.sh" ]]; then
  ok "backup.sh script" "present"
else
  fail "scripts/backup.sh missing"
fi

if crontab -l 2>/dev/null | grep -qF "scripts/backup.sh"; then
  ok "Backup cron" "installed"
else
  warn "Backup cron not installed" "sudo bash scripts/install-backup-cron.sh"
fi

if grep -q 'device: /srv/foodbot/data' "${DEPLOY_DIR}/docker-compose.yml" 2>/dev/null; then
  ok "docker-compose data volume" "bind mount /srv/foodbot/data"
else
  warn "docker-compose volume" "verify data bind mount in docker-compose.yml"
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
