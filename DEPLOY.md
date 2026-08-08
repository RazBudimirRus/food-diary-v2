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

### Обновление на main (v2.28.0+)

Прод использует внешний nginx + `docker-compose.prod.yml`:

```bash
cd /srv/foodbot

# Если раньше правили/собирали под root — сначала починить владельца
sudo chown -R "$USER:$USER" /srv/foodbot

git fetch origin
git checkout main
git pull --ff-only origin main

# бэкап БД перед обновлением
mkdir -p /srv/foodbot/data/backups
sudo cp /srv/foodbot/data/data.db "/srv/foodbot/data/backups/pre-v2.28.0-$(date +%Y%m%d_%H%M%S).db"

# ClamAV убран в v2.27.1 — если контейнер ещё крутится, остановить
sudo docker compose -f docker-compose.prod.yml stop clamav 2>/dev/null || true
sudo docker compose -f docker-compose.prod.yml rm -f clamav 2>/dev/null || true

sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml ps
curl -sS https://fooddiary.razbudimir.com/api/health | jq
curl -sS https://fooddiary.razbudimir.com/api/now
# логи при проблемах
sudo docker compose -f docker-compose.prod.yml logs --tail=80 api
```

Smoke после деплоя: логин, дневник, админка, кабинет врача (assignment-only доступ), экспорт данных без hash.

### Основной прод (Caddy на том же хосте)

```bash
cd /srv/foodbot
git fetch origin
git checkout main   # или нужная ветка
git pull
docker compose up -d --build
docker compose ps
curl -sS https://fooddiary.razbudimir.com/api/health
curl -sS https://fooddiary.razbudimir.com/api/now
```

### Preview ветка `refactor/v2.27.0` (Phase 29 W0–W4 + W3 DDL)

После этого деплоя схема БД создаётся **только** миграциями (`runMigrations`), без `CREATE TABLE` в `storage.ts`. На существующей prod-БД поведение не меняется; на пустой БД достаточно штатного boot. Локальная проверка: `npx tsx script/cold-start-check.ts`.

На сервере с внешним nginx (`docker-compose.prod.yml`):

```bash
cd /srv/foodbot

# Если раньше правили/собирали под root — сначала починить владельца,
# иначе git checkout падает с Permission denied.
sudo chown -R "$USER:$USER" /srv/foodbot

git fetch origin
git checkout refactor/v2.27.0
git reset --hard origin/refactor/v2.27.0
git clean -fd

# бэкап БД перед обновлением
mkdir -p /srv/foodbot/data/backups
sudo cp /srv/foodbot/data/data.db "/srv/foodbot/data/backups/pre-v2.27.0-$(date +%Y%m%d_%H%M%S).db"

sudo docker compose -f docker-compose.prod.yml up -d --build
sudo docker compose -f docker-compose.prod.yml ps
curl -sS https://fooddiary.razbudimir.com/api/health
curl -sS https://fooddiary.razbudimir.com/api/now
# логи при проблемах
sudo docker compose -f docker-compose.prod.yml logs --tail=80 api
```

Проверка после деплоя (ручной smoke):

1. Логин / дневник — свои приёмы пищи на месте
2. Админка → Журнал (audit) открывается у admin
3. Каталог / кабинет врача (если роль есть) — вкладки открываются
4. Версия в UI / `package.json` в образе соответствует ветке

Откат на `main`:

```bash
cd /srv/foodbot
git fetch origin && git checkout main && git reset --hard origin/main
sudo docker compose -f docker-compose.prod.yml up -d --build
```

---

## Структура контейнеров (Phase 6)

| Контейнер        | Назначение              | Порт на хосте             |
| ---------------- | ----------------------- | ------------------------- |
| `food_diary_api` | Backend API + React SPA | — (только Docker network) |
| `food_caddy`     | HTTPS reverse proxy     | 80, 443                   |

## База данных

SQLite `data.db` в `/srv/foodbot/data/` (bind mount).  
Бэкап: `cp /srv/foodbot/data/data.db /backup/data-$(date +%Y%m%d).db`

## Troubleshooting

| Симптом               | Решение                                           |
| --------------------- | ------------------------------------------------- |
| Caddy не стартует     | Проверить `certs/fullchain.pem` и `privkey.pem`   |
| 526 / SSL error       | Неверная цепочка сертификатов                     |
| Cookie не сохраняется | Нужен HTTPS; `COOKIE_SECURE=1` в production       |
| 502 Bad Gateway       | `docker compose logs api` — дождаться healthcheck |

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
