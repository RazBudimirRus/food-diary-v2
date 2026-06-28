#!/usr/bin/env bash
# =============================================================================
#  install.sh — Food Diary V2 interactive installer
#  Target: Ubuntu 22.04 / 24.04 LTS
#  Usage:  sudo bash install.sh
#          (run from the project directory after git clone)
# =============================================================================
set -euo pipefail

# ── Colors & symbols ──────────────────────────────────────────────────────────
R='\033[0;31m'  G='\033[0;32m'  Y='\033[1;33m'  C='\033[0;36m'
W='\033[1;37m'  DIM='\033[2m'   BOLD='\033[1m'   RST='\033[0m'
TICK="${G}✔${RST}"  CROSS="${R}✘${RST}"  ARROW="${C}›${RST}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_hr()  { echo -e "  ${DIM}$(printf '─%.0s' {1..54})${RST}"; }
_hdr() { echo -e "\n  ${BOLD}${C}$*${RST}"; _hr; }
_ok()  { echo -e "  ${TICK}  ${W}$1${RST}${2:+  ${DIM}$2${RST}}"; }
_err() { echo -e "  ${CROSS}  ${R}${BOLD}$1${RST}${2:+  ${DIM}$2${RST}}"; }
_inf() { echo -e "     ${ARROW} ${DIM}$*${RST}"; }
_ask() { echo -e "\n  ${Y}${BOLD}?  $1${RST}"; }

# ── Root check ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo -e "${R}Запусти от root: sudo bash install.sh${RST}"
  exit 1
fi

# ── Header ────────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "  ${BOLD}${C}╔══════════════════════════════════════════════════════╗${RST}"
echo -e "  ${BOLD}${C}║${RST}  ${W}${BOLD}🥗  Food Diary V2 — Интерактивный установщик${RST}      ${C}${BOLD}║${RST}"
echo -e "  ${BOLD}${C}║${RST}  ${DIM}Директория: ${SCRIPT_DIR}${RST}"
echo -e "  ${BOLD}${C}╚══════════════════════════════════════════════════════╝${RST}"
echo ""

# =============================================================================
# ШАГ 1 — Проверка готовности сервера (preflight)
# =============================================================================
_hdr "[1/5]  Проверка готовности сервера"

PREFLIGHT="${SCRIPT_DIR}/preflight-check.sh"

if [[ ! -f "$PREFLIGHT" ]]; then
  _err "preflight-check.sh не найден" "скачиваю..."
  wget -qO "$PREFLIGHT" \
    https://raw.githubusercontent.com/RazBudimirRus/food-diary-v2/main/preflight-check.sh
  chmod +x "$PREFLIGHT"
  _ok "preflight-check.sh загружен"
fi

echo ""
echo -e "  ${Y}Запускаю preflight-check.sh...${RST}"
echo ""

# Запускаем preflight; при ошибках скрипт может завершиться с ненулевым кодом —
# перехватываем чтобы установщик продолжил (пользователь сам решает что делать)
PREFLIGHT_EXIT=0
bash "$PREFLIGHT" || PREFLIGHT_EXIT=$?

echo ""
_hr

if [[ $PREFLIGHT_EXIT -ne 0 ]]; then
  echo -e "  ${R}${BOLD}Preflight завершился с ошибками (код $PREFLIGHT_EXIT).${RST}"
else
  echo -e "  ${G}${BOLD}Preflight завершился успешно.${RST}"
fi

# ── Кнопка 1: подтверждение отчёта ───────────────────────────────────────────
echo ""
_ask "Ты ознакомился с отчётом preflight выше?"
echo -e "     ${DIM}Введи Y чтобы продолжить, N чтобы выйти и исправить проблемы.${RST}"
echo ""
read -rp "  [Y/n] " _ans
_ans="${_ans:-Y}"

if [[ ! "$_ans" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "  ${Y}Установка прервана. Исправь ошибки и запусти install.sh заново.${RST}"
  echo ""
  exit 0
fi

_ok "Preflight подтверждён" "продолжаем установку"

# ── Кнопка 2 (если были ошибки): подтверждение что всё равно продолжаем ─────
if [[ $PREFLIGHT_EXIT -ne 0 ]]; then
  echo ""
  _ask "Preflight показал ошибки. Продолжить установку несмотря на это?"
  echo -e "     ${DIM}Рекомендуется исправить блокеры перед установкой.${RST}"
  echo ""
  read -rp "  [y/N] " _force
  _force="${_force:-N}"
  if [[ ! "$_force" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "  ${Y}Установка прервана. Исправь ошибки preflight и запусти заново.${RST}"
    echo ""
    exit 0
  fi
  echo -e "  ${Y}Продолжаем на твой страх и риск.${RST}"
fi

# =============================================================================
# ШАГ 2 — Домен
# =============================================================================
_hdr "[2/5]  Домен приложения"

echo -e "  ${W}На каком домене будет работать приложение?${RST}"
echo ""
echo -e "  ${DIM}Примеры:${RST}"
echo -e "  ${DIM}  fooddiary.example.com${RST}"
echo -e "  ${DIM}  app.mysite.ru${RST}"
echo -e "  ${DIM}  diary.test.mysite.com${RST}"
echo ""
echo -e "  ${Y}Введи домен (без https://, без слеша в конце):${RST}"
echo ""

while true; do
  read -rp "  Домен: " INPUT_DOMAIN
  INPUT_DOMAIN="${INPUT_DOMAIN// /}"   # убираем пробелы

  if [[ -z "$INPUT_DOMAIN" ]]; then
    _err "Домен не может быть пустым" "введи имя домена"
    continue
  fi

  # Базовая валидация: должен содержать точку, не начинаться с http
  if [[ "$INPUT_DOMAIN" =~ ^https?:// ]]; then
    INPUT_DOMAIN="${INPUT_DOMAIN#*://}"
    INPUT_DOMAIN="${INPUT_DOMAIN%%/*}"
    echo -e "  ${DIM}(убрал протокол → ${INPUT_DOMAIN})${RST}"
  fi

  if [[ ! "$INPUT_DOMAIN" =~ \. ]]; then
    _err "Некорректный домен" "должна быть хотя бы одна точка (пример: app.example.com)"
    continue
  fi

  break
done

echo ""
_ok "Домен задан: ${INPUT_DOMAIN}"

# DNS-проверка (не блокирующая — просто информация)
echo ""
if getent hosts "$INPUT_DOMAIN" &>/dev/null; then
  RESOLVED=$(getent hosts "$INPUT_DOMAIN" | awk '{print $1}' | head -1)
  _ok "DNS: ${INPUT_DOMAIN}" "резолвится → ${RESOLVED}"
else
  echo -e "  ${Y}!${RST}  ${Y}DNS: ${INPUT_DOMAIN} не резолвится${RST}"
  _inf "Добавь A-запись: ${INPUT_DOMAIN} → IP этого сервера"
  _inf "TLS-сертификат Caddy получит только после появления DNS-записи"
fi

# =============================================================================
# ШАГ 3 — Настройка .env
# =============================================================================
_hdr "[3/5]  Настройка переменных окружения"

ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  echo -e "  ${Y}!${RST}  ${Y}.env уже существует.${RST}"
  _ask "Перезаписать .env из .env.example? (текущий .env будет сохранён как .env.bak)"
  echo ""
  read -rp "  [y/N] " _overwrite
  _overwrite="${_overwrite:-N}"
  if [[ "$_overwrite" =~ ^[Yy]$ ]]; then
    cp "$ENV_FILE" "${ENV_FILE}.bak"
    _ok ".env.bak сохранён"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    _ok ".env создан из .env.example"
  else
    _ok ".env оставлен без изменений" "домен всё равно будет обновлён"
  fi
else
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  _ok ".env создан из .env.example"
fi

# Подставляем домен во все нужные переменные
_set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

_set_env "DOMAIN"          "${INPUT_DOMAIN}"
_set_env "PUBLIC_URL"      "https://${INPUT_DOMAIN}"
_set_env "ALLOWED_ORIGINS" "https://${INPUT_DOMAIN}"

_ok "DOMAIN=${INPUT_DOMAIN}"
_ok "PUBLIC_URL=https://${INPUT_DOMAIN}"
_ok "ALLOWED_ORIGINS=https://${INPUT_DOMAIN}"

# Генерируем секреты если не заданы
_gen_secret() {
  local key="$1"
  local cur
  cur=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [[ -z "$cur" || "$cur" == *"CHANGE_ME"* || "$cur" == *"generate"* ]]; then
    local secret
    secret=$(openssl rand -hex 32)
    _set_env "$key" "$secret"
    _ok "${key} сгенерирован" "(32 байта, hex)"
  else
    _ok "${key} уже задан" "не трогаем"
  fi
}

echo ""
echo -e "  ${DIM}Генерация секретов (если не заданы)...${RST}"
_gen_secret "JWT_SECRET"
_gen_secret "REFRESH_SECRET"
_gen_secret "ENCRYPTION_KEY"

echo ""
echo -e "  ${Y}Проверь и при необходимости дополни .env вручную:${RST}"
_inf "nano ${ENV_FILE}"
_inf "Важные поля: DEEPSEEK_API_KEY, SMTP_* (для сброса пароля)"
echo ""
_ask "Ты проверил .env и готов продолжить?"
echo ""
read -rp "  [Y/n] " _env_ok
_env_ok="${_env_ok:-Y}"
if [[ ! "$_env_ok" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "  ${Y}Пауза. Отредактируй .env и запусти install.sh заново.${RST}"
  echo ""
  exit 0
fi

# =============================================================================
# ШАГ 4 — Сборка и запуск контейнеров
# =============================================================================
_hdr "[4/5]  Запуск Docker Compose"

cd "$SCRIPT_DIR"

echo -e "  ${DIM}Запускаю: docker compose up -d --build${RST}"
echo ""
docker compose up -d --build

echo ""
_ok "Контейнеры запущены"
echo ""

# Ждём healthcheck API
echo -e "  ${DIM}Ожидаю готовности API (до 60 сек)...${RST}"
WAIT=0
until curl -sf "http://localhost:${PORT:-5000}/api/now" &>/dev/null; do
  sleep 3; WAIT=$((WAIT+3))
  if [[ $WAIT -ge 60 ]]; then
    echo ""
    _err "API не отвечает за 60 сек" "проверь логи: docker compose logs api"
    break
  fi
  echo -ne "  ${DIM}  ожидание... ${WAIT}s${RST}\r"
done

API_CODE=$(curl -so /dev/null -w "%{http_code}" "http://localhost:${PORT:-5000}/api/now" 2>/dev/null || echo "000")
if [[ "$API_CODE" == "200" ]]; then
  _ok "API отвечает" "HTTP 200 /api/now"
fi

# =============================================================================
# ШАГ 5 — Итог
# =============================================================================
_hdr "[5/5]  Установка завершена"

echo ""
echo -e "  ${G}${BOLD}🎉  Food Diary V2 успешно установлен!${RST}"
echo ""
echo -e "  ${W}Доступ:${RST}"
echo -e "     ${ARROW} ${C}https://${INPUT_DOMAIN}${RST}           — основной адрес (после настройки DNS+TLS)"
echo -e "     ${ARROW} ${C}http://$(hostname -I | awk '{print $1}'):${PORT:-5000}${RST}  — временный доступ по IP"
echo ""
echo -e "  ${W}Полезные команды:${RST}"
echo -e "     ${DIM}docker compose ps${RST}              — статус контейнеров"
echo -e "     ${DIM}docker compose logs -f api${RST}     — логи приложения"
echo -e "     ${DIM}docker compose logs -f caddy${RST}   — логи Caddy/TLS"
echo -e "     ${DIM}docker compose restart api${RST}     — перезапуск после обновления"
echo -e "     ${DIM}sudo bash preflight-check.sh${RST}   — повторная проверка сервера"
echo ""
echo -e "  ${W}Следующие шаги:${RST}"
echo -e "     ${ARROW} ${DIM}Добавь DNS A-запись: ${INPUT_DOMAIN} → $(hostname -I | awk '{print $1}')${RST}"
echo -e "     ${ARROW} ${DIM}Положи TLS-сертификаты в ./certs/ (fullchain.pem + privkey.pem)${RST}"
echo -e "     ${ARROW} ${DIM}Или настрой nginx/apache как reverse proxy (см. preflight секция [5])${RST}"
echo -e "     ${ARROW} ${DIM}Зарегистрируй первого пользователя на странице входа${RST}"
echo ""
echo -e "  ${DIM}Лог preflight: /tmp/food_diary_preflight_*.log${RST}"
echo ""
