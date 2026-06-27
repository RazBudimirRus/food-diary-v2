# Деплой Food Diary V2 на Ubuntu 24.04 VPS

**Домен:** https://fooddiary.razbudimir.com  
**IP сервера:** 149.33.12.166

---

## 1. Подготовка сервера

```bash
sudo apt update && sudo apt install -y ca-certificates curl openssl
# Docker — см. README или preflight-check.sh --fix
sudo mkdir -p /srv/foodbot/data /srv/foodbot/certs
sudo chown -R $USER:$USER /srv/foodbot
```

## 2. Загрузить код

```bash
cd /srv/foodbot
git clone https://github.com/RazBudimirRus/food-diary-v2.git .
```

## 3. DNS (Phase 6)

В панели DNS создайте A-запись:

```
fooddiary.razbudimir.com  →  149.33.12.166
```

Проверка:

```bash
getent hosts fooddiary.razbudimir.com
```

## 4. TLS-сертификаты

Скопируйте wildcard `*.razbudimir.com` в `certs/`:

```bash
cp /path/to/fullchain.pem /srv/foodbot/certs/
cp /path/to/privkey.pem /srv/foodbot/certs/
chmod 600 /srv/foodbot/certs/privkey.pem
openssl x509 -in certs/fullchain.pem -noout -subject -dates
```

Подробнее: `certs/README.md`

## 5. Создать .env

```bash
cp .env.example .env
nano .env
```

Минимум:

```env
JWT_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
DOMAIN=fooddiary.razbudimir.com
PUBLIC_URL=https://fooddiary.razbudimir.com
TRUST_PROXY=1
```

## 6. Фаервол (Phase 6)

Открыть только 80/443, **закрыть 5000**:

```bash
sudo bash scripts/setup-ufw-phase6.sh
```

## 7. Проверка перед запуском

```bash
sudo bash preflight-check.sh
```

## 8. Запустить (Caddy + API)

```bash
cd /srv/foodbot
docker compose up -d --build
docker compose ps
docker compose logs -f caddy
```

## 9. Проверить HTTPS

```bash
curl -I https://fooddiary.razbudimir.com/api/now
# Ожидается: HTTP/2 200 + strict-transport-security

# В браузере
open https://fooddiary.razbudimir.com
```

## 10. Локальная разработка (без Caddy)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d api
# http://localhost:5000
```

## 11. Обновление

```bash
cd /srv/foodbot
git pull
docker compose up -d --build
```

---

## Структура контейнеров (Phase 6)

| Контейнер | Назначение | Порт на хосте |
|---|---|---|
| `food_diary_api` | Backend API + React SPA | — (только Docker network) |
| `food_caddy` | HTTPS reverse proxy | 80, 443 |

## База данных

SQLite `data.db` в `/srv/foodbot/data/` (bind mount).  
Бэкап: `cp /srv/foodbot/data/data.db /backup/data-$(date +%Y%m%d).db`

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| Caddy не стартует | Проверить `certs/fullchain.pem` и `privkey.pem` |
| 526 / SSL error | Неверная цепочка сертификатов |
| Cookie не сохраняется | Нужен HTTPS; `COOKIE_SECURE=1` в production |
| 502 Bad Gateway | `docker compose logs api` — дождаться healthcheck |

---

## 12. Бэкапы (Phase 3)

Данные: `/srv/foodbot/data/data.db` (bind mount, **не удаляется** при `docker compose down`).

```bash
# Ручной бэкап (hot backup, без остановки)
cd /srv/foodbot
bash scripts/backup.sh

# Автобэкап ежедневно в 03:00 MSK
sudo bash scripts/install-backup-cron.sh

# Проверка
ls -la /srv/foodbot/data/backups/
```

Хранится **30** последних копий (`BACKUP_RETENTION` в `.env`).

Восстановление:

```bash
docker compose stop api
cp /srv/foodbot/data/backups/food-diary_YYYYMMDD_HHMMSS.db /srv/foodbot/data/data.db
docker compose start api
```

> **Важно:** никогда не используйте `docker compose down -v` — флаг `-v` удалит named volumes (не bind mount, но лучше избегать).

---

## 14. Cloudflare WAF (Phase 7)

Проксирование: **DNS → Cloudflare → VPS (Caddy) → API**.

### 14.1. DNS в Cloudflare

1. Добавьте зону `razbudimir.com` в Cloudflare (если ещё нет).
2. A-запись `fooddiary` → `149.33.12.166`, статус **Proxied** (оранжевое облако).
3. Дождитесь активации SSL.

### 14.2. SSL/TLS

| Режим | Когда |
|-------|--------|
| **Full (strict)** | На сервере валидный origin cert (`certs/fullchain.pem`) — рекомендуется |
| Full | Только если origin cert самоподписанный (не рекомендуется) |

Не включайте **Full (strict)** до появления валидного сертификата на origin — иначе **526**.

Альтернатива: [Cloudflare Origin Certificate](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) в `certs/` вместо wildcard.

### 14.3. Firewall (опционально)

Cloudflare → **Security** → **WAF** → custom rules (бесплатно до 5 правил):

| Правило | Выражение | Действие |
|---------|-----------|----------|
| Только РФ (опционально) | `(ip.geoip.country ne "RU")` | Block |
| Брутфорс логина | `(http.request.uri.path eq "/api/auth/login")` | Rate limit (например 10 / 15 min) |

На уровне приложения уже есть rate-limit `/api/auth/login` (10 / 15 min / IP). После Phase 7 IP берётся из `CF-Connecting-IP`.

### 14.4. Проверка после включения прокси

```bash
# С сервера — origin напрямую
curl -I https://fooddiary.razbudimir.com/api/now

# Должен быть cf-ray в ответе (через Cloudflare)
curl -sI https://fooddiary.razbudimir.com/api/now | grep -i cf-ray

# В админке: IP активных сессий = реальный клиент, не IP edge Cloudflare
```

### 14.5. Обновление стека

После `git pull` с Phase 7:

```bash
cd /home/razbudimir/food_app   # или /srv/foodbot
docker compose up -d --build
```

`TRUST_PROXY=1` должен оставаться в `.env`.
