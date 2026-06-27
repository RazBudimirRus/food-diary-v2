<div align="center">

# 🥗 Food Diary V2

**Личный дневник питания** — веб-приложение с авторизацией и выгрузкой отчёта в формате Excel для врача.

**Personal food diary** — web application with authentication and Excel report export for your doctor.

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![CI](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml)

</div>

---

## Содержание / Contents

- [🇷🇺 Русский](#-русский)
  - [Описание](#описание)
  - [Возможности](#возможности)
  - [Архитектура](#архитектура)
  - [Установка и запуск](#установка-и-запуск)
  - [Использование](#использование)
  - [Структура проекта](#структура-проекта)
- [🇬🇧 English](#-english)
  - [Description](#description)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Installation & Setup](#installation--setup)
  - [Usage](#usage)
  - [Project Structure](#project-structure)

---

# 🇷🇺 Русский

## Описание

Food Diary V2 — инструмент для ведения дневника питания, разработанный для личного контроля и совместной работы с лечащим врачом или нутрициологом. Сервис позволяет фиксировать каждый приём пищи через веб-форму, отслеживать уровень голода и насыщения по шкале 0–10, а в конце дня скачивать готовый Excel-отчёт в формате, согласованном с врачом.

Приложение поддерживает несколько пользователей — каждый регистрируется через браузер, данные изолированы. Секреты хранятся в зашифрованном виде (AES-256-GCM).

> **Версия 1 (текущая):** текстовый ввод через веб-форму. Распознавание по фото (GigaChat Vision) запланировано в V2.

## Возможности

| Функция                                | Статус |
| -------------------------------------- | :----: |
| Регистрация / вход / выход             |   ✅   |
| Добавить приём пищи                    |   ✅   |
| Навигация по датам                     |   ✅   |
| Шкала голода/насыщения 0–10            |   ✅   |
| Контекст приёма (где, как)             |   ✅   |
| Итоги дня (подъём/спорт/шаги)          |   ✅   |
| Excel-отчёт для врача                  |   ✅   |
| Удаление записи                        |   ✅   |
| Редактирование записи                  |   ✅   |
| Зашифрованное хранение секретов        |   ✅   |
| Access/refresh sessions, idle timeout  |   ✅   |
| HTTPS/Caddy, Helmet, CORS, rate limits |   ✅   |
| Unit/integration/E2E tests + CI        |   ✅   |
| Админ-панель MVP                       |   ✅   |
| Блокировка DeepSeek по дневному лимиту |   ✅   |
| Аналитика питания и графики            |   ✅   |
| Логин в админ-панели                   |   ✅   |
| Перенос приёма между днями             |   ✅   |
| Явные даты подъёма/отбоя               |   ✅   |
| Календарные периоды аналитики          |   ✅   |
| Распознавание фото                     | 🔜 V2  |

### Excel-отчёт

Формируется по формату лечащего врача:

- **7 колонок:** интервал приёма, голод до (0–10), тип приёма, что ел, что пил, насыщение после (0–10), контекст
- **Итоги дня:** подъём, отбой, спорт, шаги, общий комментарий
- **Автоматические итоги:** суммарный объём воды, количество приёмов, средний голод/насыщение — с пустыми полями «по версии врача»
- **Цветная легенда шкалы голода** (зелёная зона 3–7, красная зона 0–2 и 8–10)

### Шкала голода

```
0 — Экстремальный голод        🔴   7 — Комфортная сытость         🟢
1 — Сильный голод              🔴   8 — Переел                     🔴
2 — Ощутимый голод             🔴   9 — Дискомфорт от переедания   🔴
3 — Основательно проголодался  🟢  10 — Экстремальное переедание   🔴
4 — Лёгкий голод               🟢
5 — Нейтрально                 🟢
6 — Лёгкая сытость             🟢
```

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Клиенты                              │
│              ┌──────────────────────────┐                   │
│              │      Веб-браузер         │                   │
│              └────────────┬─────────────┘                   │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              api  (Node.js / Express)                │   │
│  │                                                      │   │
│  │  • Vite SPA (React 18)      • Auth (JWT + bcrypt)   │   │
│  │  • REST API (/api/*)        • AES-256-GCM secrets    │   │
│  │  • Excel generator          • requireAuth middleware  │   │
│  │  • Drizzle ORM + SQLite                              │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │              data.db  (SQLite)                       │   │
│  │              <project-dir>/data/                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Стек технологий

| Слой                | Технология                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Frontend            | React 18, Vite, Tailwind CSS v3, shadcn/ui, TanStack Query                                     |
| Backend             | Node.js 20, Express, TypeScript                                                                |
| База данных         | SQLite (better-sqlite3) + Drizzle ORM                                                          |
| Аутентификация      | bcryptjs (cost 12), access JWT 30 минут в памяти React, refresh token 7 дней в httpOnly cookie |
| Шифрование секретов | AES-256-GCM, ключ из `ENCRYPTION_KEY`                                                          |
| Excel               | exceljs                                                                                        |
| Контейнеризация     | Docker, Docker Compose (1 сервис: `api`)                                                       |
| Reverse proxy       | Caddy + HTTPS                                                                                  |
| Безопасность        | Helmet/CSP/HSTS, CORS whitelist, rate-limit auth/meals                                         |
| Качество            | Vitest, Supertest, Playwright, ESLint, Prettier, GitHub Actions                                |
| Часовой пояс        | МСК (UTC+3) — день = 00:00–23:59 MSK                                                           |

## Установка и запуск

### Требования

- Ubuntu 22.04 / 24.04 LTS
- Docker >= 24 + Docker Compose plugin
- Минимум 1 GB RAM, 5 GB свободного диска

### Шаг 0. Проверка готовности сервера

Скрипт запускается **из папки проекта** (после клонирования на шаге 3). Он автоматически определяет рабочую директорию — захардкоженных путей нет.

```bash
# Выполняется из папки проекта:
sudo bash preflight-check.sh
```

Скрипт проверяет 11 параметров (OS, RAM, диск, сеть, Docker, порты, firewall, переменные окружения, образы, API health) и выводит цветной отчёт. При наличии типовых проблем запустите с флагом `--fix`:

```bash
sudo bash preflight-check.sh --fix
```

### Шаг 1. Установка Docker

```bash
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker   # применить без перелогина
```

### Шаг 2. Выбор рабочей директории

Выберите любую папку на сервере, где будет жить проект:

```bash
mkdir -p ~/food-diary && cd ~/food-diary
# или любой другой путь, например:
# mkdir -p /srv/foodbot && cd /srv/foodbot
```

### Шаг 3. Клонирование репозитория

```bash
git clone https://github.com/RazBudimirRus/food-diary-v2.git .
```

### Шаг 4. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Минимальный `.env`:

```env
JWT_SECRET=<случайная строка, минимум 40 символов>
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_COOKIE_MAX_AGE=604800
SESSION_IDLE_WARNING_MIN=25
SESSION_IDLE_TIMEOUT_MIN=30
ENCRYPTION_KEY=<случайная строка, минимум 40 символов>
PUBLIC_URL=https://fooddiary.razbudimir.com
ALLOWED_ORIGINS=https://fooddiary.razbudimir.com
TRUST_PROXY=1
# ADMIN_BOOTSTRAP_USERNAME=<существующий логин для роли admin>
DEEPSEEK_DAILY_TOKEN_LIMIT=100000
DEEPSEEK_INPUT_USD_PER_M_TOKENS=0.27
DEEPSEEK_OUTPUT_USD_PER_M_TOKENS=1.10
```

Сгенерировать значения:

```bash
openssl rand -hex 32   # для JWT_SECRET
openssl rand -hex 32   # для ENCRYPTION_KEY
```

### Шаг 5. Запуск

```bash
docker compose up -d --build
```

### Локальная разработка и проверки

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e` автоматически собирает приложение, поднимает production server на `127.0.0.1:5174`
и запускает Playwright smoke-flow. При первом запуске может понадобиться `npx playwright install chromium`.

Проверить статус:

```bash
docker compose ps
docker compose logs -f
```

### Шаг 6. Доступ

| Сервис     | Адрес                                  |
| ---------- | -------------------------------------- |
| Веб-форма  | `http://<IP_сервера>:5000`             |
| API health | `http://<IP_сервера>:5000/api/auth/me` |

При первом входе нажмите **«Регистрация»** и создайте учётную запись.

### Шаг 7 (опционально). Caddy + домен

Если есть домен — раскомментируйте в `Caddyfile` блок с доменом и добавьте Caddy в `docker-compose.yml`:

```yaml
caddy:
  image: caddy:2-alpine
  container_name: food_caddy
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
    - caddy_data:/data
    - caddy_config:/config
  networks:
    - food_net
  depends_on:
    - api
```

Добавьте в раздел `volumes`:

```yaml
caddy_data:
caddy_config:
```

### Обновление

```bash
cd <папка-проекта>
git pull
docker compose up -d --build
```

### Бэкап базы данных

```bash
# Ручной бэкап
cp <project-dir>/data/data.db /backup/data-$(date +%Y%m%d_%H%M%S).db

# Автоматический (cron, ежедневно в 03:00)
echo "0 3 * * * cp <project-dir>/data/data.db /backup/data-\$(date +\%Y\%m\%d).db" | crontab -
```

## Использование

### Веб-форма

1. Откройте `http://<сервер>:5000`
2. При первом входе нажмите **«Регистрация»** → введите имя пользователя, e-mail и пароль
3. После входа — навигация по датам стрелками в шапке (нельзя выбрать дату в будущем)
4. Нажмите **«Добавить приём пищи»** → заполните форму
5. Чтобы исправить запись, нажмите кнопку **«Редактировать»** в карточке приёма пищи, измените поля и сохраните
6. Кнопка **«Отчёт»** в шапке → если итоги дня ещё не заполнены, откроется диалог (подъём/отбой/спорт/шаги). При повторном скачивании диалог не показывается
7. Файл скачивается как `Дневник_питания_YYYY-MM-DD.xlsx`
8. Для выхода — кнопка **«Выйти»** в шапке (иконка выхода)

> **Важно:** один день = 00:00–23:59 по МСК (UTC+3). Записи всегда относятся к московскому времени независимо от часового пояса устройства.

## Структура проекта

```
food-diary-v2/
├── client/                      # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── AuthPage.tsx     # Страница входа / регистрации
│       │   └── DiaryPage.tsx    # Основной интерфейс дневника
│       ├── lib/
│       │   ├── auth.tsx         # AuthProvider + useAuth hook
│       │   └── queryClient.ts   # API client (TanStack Query)
│       └── components/ui/       # shadcn/ui компоненты
│
├── server/                      # Node.js backend (Express)
│   ├── auth.ts                  # access JWT, refresh cookies, bcrypt, AES-256-GCM, requireAuth
│   ├── routes.ts                # REST API endpoints
│   ├── storage.ts               # Drizzle ORM + SQLite
│   └── excel.ts                 # Генератор Excel-отчётов
│
├── shared/
│   └── schema.ts                # Drizzle schema (users, secrets, days, meals)
│
├── test/                        # Vitest unit/integration tests
├── tests/e2e/                   # Playwright E2E smoke tests
│
├── bot/                         # (не используется в V1, зарезервировано для V2)
│
├── docker-compose.yml           # Один сервис: api
├── Dockerfile.api               # Node.js контейнер
├── Caddyfile                    # Конфиг reverse proxy
├── preflight-check.sh           # Скрипт проверки сервера перед установкой
├── DEPLOY.md                    # Детальный гайд по деплою (RU)
└── .env.example                 # Шаблон переменных окружения
```

## API Reference

| Method | Endpoint                |  Auth  | Description                                    |
| ------ | ----------------------- | :----: | ---------------------------------------------- |
| POST   | `/api/auth/register`    |   —    | Регистрация пользователя                       |
| POST   | `/api/auth/login`       |   —    | Вход: access token в JSON + refresh cookie     |
| POST   | `/api/auth/refresh`     | cookie | Обновить access token по refresh cookie        |
| POST   | `/api/auth/logout`      | cookie | Выход: отзывает refresh token и очищает cookie |
| GET    | `/api/auth/me`          |   ✅   | Текущий пользователь                           |
| GET    | `/api/secrets`          |   ✅   | Список сохранённых секретов                    |
| PUT    | `/api/secrets/:name`    |   ✅   | Сохранить/обновить секрет (зашифровано)        |
| GET    | `/api/days/:date`       |   ✅   | Данные дня + приёмы пищи (YYYY-MM-DD)          |
| POST   | `/api/meals`            |   ✅   | Добавить приём пищи                            |
| DELETE | `/api/meals/:id`        |   ✅   | Удалить запись                                 |
| PATCH  | `/api/meals/:id`        |   ✅   | Обновить запись                                |
| POST   | `/api/days/:id/summary` |   ✅   | Сохранить итоги дня                            |
| GET    | `/api/report/:date`     |   ✅   | Скачать Excel (202 если итоги не заполнены)    |
| GET    | `/api/analytics/summary` |   ✅   | Сводка аналитики питания за период             |
| GET    | `/api/now`              |   —    | Текущие дата и время МСК                       |

## Roadmap

- [x] Phase 6: HTTPS + Caddy deployment
- [x] Phase 3: SQLite persistence, WAL mode, backups
- [x] Phase 10: access/refresh session lifecycle + idle timeout
- [x] Phase 2: security hardening and audit fixes
- [x] Phase 1: tests, linting, E2E smoke, CI
- [x] UX-1: edit existing meal entries
- [x] Phase 4: admin panel MVP
- [x] Phase 9: DeepSeek usage alerting / daily limit blocking
- [x] Phase 11: analytics dashboard MVP
- [x] UX-2: admin username visibility
- [x] UX-3: move meals between days when editing
- [x] UX-4: explicit wake/sleep dates
- [x] UX-5: calendar analytics periods

## Changelog

### [1.13.0] — 2026-06-27

**feat: UX-2…UX-5 admin, meal move, sleep dates, calendar analytics**

- Admin panel shows `username` as the primary identifier in users/sessions tables
- Meal edit allows changing date; `PATCH /api/meals/:id` moves records between days
- Day summary stores `wakeDate`/`sleepDate`; Excel and analytics use explicit date+time sleep math
- Analytics uses calendar week/month/year periods with empty-day padding and prev/next navigation
- Added `shared/dates.ts`, unit/integration coverage, updated E2E edit flow

### [1.12.0] — 2026-06-27

**feat: Phase 11 analytics dashboard MVP**

- Added `/api/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Aggregates meals, calories, БЖУ, water, hunger/satiety, sleep and steps per day
- Added `/#/analytics` page with period switches, summary cards and Recharts graphs
- Added integration coverage for analytics auth and per-user aggregates

### [1.11.0] — 2026-06-27

**feat: Phase 9 DeepSeek daily limit guard**

- Blocks `/api/analyze` with `429` when `DEEPSEEK_DAILY_TOKEN_LIMIT` is reached
- Returns structured limit status without calling DeepSeek after the limit is reached
- Shows blocked/allowed analysis status in the admin DeepSeek usage card
- Added integration coverage for daily limit blocking

### [1.10.0] — 2026-06-27

**feat: Phase 4 DeepSeek usage dashboard**

- Added `api_usage` storage for DeepSeek token and cost tracking
- Records DeepSeek prompt/completion tokens after successful КБЖУ analysis
- Added admin DeepSeek usage summary with daily token limit status
- Added dashboard cards and recent daily usage table to `/#/admin`
- Added integration coverage for admin usage access
- External notifications remain planned for Phase 9

### [1.9.0] — 2026-06-27

**feat: Phase 4 admin password reset**

- Added admin user list endpoint and UI table
- Added admin password reset action that returns a one-time temporary password
- Revokes the selected user's refresh sessions after password reset
- Added integration coverage for admin reset permissions and new-password login
- Phase 4 still has DeepSeek usage dashboard/alerts pending

### [1.8.0] — 2026-06-27

**feat: Phase 4 session management**

- Added admin API actions to revoke one refresh session or all sessions for a user
- Added session management buttons to the guarded admin page
- Added integration coverage for admin session revoke permissions and behavior
- Phase 4 still has password reset and DeepSeek dashboard slices pending

### [1.7.0] — 2026-06-27

**feat: Phase 4 admin foundation**

- Added `user/admin` roles, admin JWT payloads, and `requireAdmin` middleware for `/api/admin/*`
- Added `ADMIN_BOOTSTRAP_USERNAME` startup bootstrap for promoting an existing user to admin
- Added read-only `/api/admin/sessions` based on active refresh sessions
- Added a guarded `/#/admin` page with an active sessions table
- Added integration coverage for admin vs non-admin access

### [1.6.0] — 2026-06-27

**feat: редактирование приёмов пищи**

- Добавлена кнопка **«Редактировать»** в карточку приёма пищи рядом с удалением
- Форма редактирования открывается с текущими значениями записи и сохраняет изменения через `PATCH /api/meals/:id`
- После сохранения обновляется TanStack Query cache текущего дня
- Расширены integration-тесты PATCH и E2E flow: add → edit → verify updated card

### [1.5.0] — 2026-06-27

**feat: session lifecycle, security hardening, and CI quality gates**

- Added refresh token table, hashed refresh tokens, 30-minute access JWTs, 7-day httpOnly refresh cookies
- Added `/api/auth/refresh`; login/register/logout now rotate or revoke refresh sessions
- React keeps access tokens in memory and refreshes them through the API client
- Added frontend idle warning/logout timers (25/30 minutes)
- Added Helmet/CSP/HSTS, CORS allowlist, rate limits for login and meal creation
- Fixed IDOR in day summary updates and strict Zod validation for meal updates
- Removed full JSON API response bodies from logs
- Added Vitest unit tests, Supertest integration tests, Playwright E2E smoke test, ESLint, Prettier, Husky, lint-staged
- Added GitHub Actions CI and Dependabot config

### [1.4.0] — 2026-06-26

**feat: HTTPS deployment and SQLite persistence**

- Added Caddy reverse proxy with HTTPS support
- Added secure cookie/proxy configuration for production
- Enabled SQLite WAL mode and backup scripts
- Added backup cron installer and deployment preflight checks

### [1.2.0] — 2026-06-26

**feat: отвязка от Telegram-бота, добавление авторизации и зашифрованных секретов**

- Удалён сервис `bot` (Python/aiogram) из Docker Compose — теперь один сервис `api`
- Добавлена таблица `users`: username, email, `passwordHash` (bcryptjs, cost 12)
- Добавлена таблица `secrets`: зашифрованное хранилище ключ-значение на пользователя (AES-256-GCM)
- Аутентификация через JWT в httpOnly cookie (срок 7 дней, sameSite: lax)
- Новые эндпоинты: `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `GET /api/auth/me`
- Новые эндпоинты: `GET/PUT/DELETE /api/secrets/:name`
- Middleware `requireAuth` — все маршруты `/api/*` защищены
- Новая страница фронтенда `AuthPage.tsx` — вкладки входа и регистрации (shadcn/ui)
- Контекст `AuthProvider` + хук `useAuth` в `client/src/lib/auth.tsx`
- Кнопка выхода и отображение имени пользователя в шапке `DiaryPage`
- Обновлён `.env.example`: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENCRYPTION_KEY` (без `TELEGRAM_BOT_TOKEN`)
- `preflight-check.sh` секция 11: валидация Telegram-токена заменена проверкой API health (`GET /api/auth/me`)

### [1.1.0] — 2026-06-25

**feat: скрипт проверки готовности сервера preflight-check.sh**

- 11 разделов: ОС, RAM, диск, интернет, Docker, порты, firewall, переменные окружения, образы, синтаксис compose, токен
- Цветной вывод с box-drawing символами, ✔/✘/⚠
- Панель SUMMARY с блокерами и цветным вердиктом (зелёный/жёлтый/красный)
- Режим `--fix`: автоустановка Docker, открытие портов, создание `.env` из шаблона
- Проверка интернета через `https://hub.docker.com/`

### [1.0.0] — 2026-06-25

**feat: начальный MVP**

- Фронтенд: React 18 + Vite + Tailwind CSS v3 + shadcn/ui
- Бэкенд: Express + TypeScript + Drizzle ORM + SQLite
- Ввод приёмов пищи: еда, напитки, шкала голода/насыщения (0–10), тип приёма, контекст
- Навигация по датам (даты в будущем недоступны)
- Диалог итогов дня: подъём, отбой, спорт, шаги, комментарий
- Генератор Excel-отчётов (exceljs) — формат врача, 7 колонок, легенда шкалы голода, автоитоги
- Docker Compose: сервисы `api` (Node.js) + `bot` (Python/aiogram 3)
- Часовой пояс МСК (UTC+3) — граница дня 00:00–23:59 MSK
- Двуязычный README (RU/EN) с диаграммой архитектуры и полным гайдом по установке

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for health tracking · <a href="https://github.com/RazBudimirRus">@RazBudimirRus</a>
</div>

---

# 🇬🇧 English

## Description

Food Diary V2 is a personal food diary web application designed for self-monitoring and collaboration with a doctor or nutritionist. It lets you log every meal through a web form, track hunger and satiety on a 0–10 scale, and download a ready-made Excel report at the end of the day in a format agreed with your doctor.

The app supports multiple users — each registers through the browser, data is isolated per account. Secrets are stored encrypted (AES-256-GCM).

> **Version 1 (current):** text input via web form. Photo recognition (GigaChat Vision) is planned for V2.

## Features

| Feature                                | Status |
| -------------------------------------- | :----: |
| Register / login / logout              |   ✅   |
| Add meal entry                         |   ✅   |
| Date navigation                        |   ✅   |
| Hunger/satiety scale 0–10              |   ✅   |
| Meal context (where, how)              |   ✅   |
| Day summary (wake/sport/steps)         |   ✅   |
| Excel report for doctor                |   ✅   |
| Delete entry                           |   ✅   |
| Edit entry                             |   ✅   |
| Encrypted secrets storage              |   ✅   |
| Access/refresh sessions, idle timeout  |   ✅   |
| HTTPS/Caddy, Helmet, CORS, rate limits |   ✅   |
| Unit/integration/E2E tests + CI        |   ✅   |
| Admin panel MVP                        |   ✅   |
| DeepSeek daily limit blocking          |   ✅   |
| Nutrition analytics and charts         |   ✅   |
| Admin username visibility              |   ✅   |
| Move meals between days                |   ✅   |
| Explicit wake/sleep dates              |   ✅   |
| Calendar analytics periods             |   ✅   |
| Photo recognition                      | 🔜 V2  |

### Excel Report

Generated in the doctor's agreed format:

- **7 columns:** time interval, hunger before (0–10), meal type, food, drink, satiety after (0–10), context
- **Day summary:** wake time, bedtime, sport activity, steps, general comment
- **Auto totals:** total water volume, meal count, avg hunger/satiety — with empty "doctor's version" fields
- **Color-coded hunger scale legend** (green zone 3–7, red zone 0–2 and 8–10)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Clients                            │
│              ┌──────────────────────────┐                   │
│              │       Web browser        │                   │
│              └────────────┬─────────────┘                   │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                      Docker Compose                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              api  (Node.js / Express)                │   │
│  │                                                      │   │
│  │  • Vite SPA (React 18)      • Auth (JWT + bcrypt)   │   │
│  │  • REST API (/api/*)        • AES-256-GCM secrets    │   │
│  │  • Excel generator          • requireAuth middleware  │   │
│  │  • Drizzle ORM + SQLite                              │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │              data.db  (SQLite)                       │   │
│  │              <project-dir>/data/                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer              | Technology                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Frontend           | React 18, Vite, Tailwind CSS v3, shadcn/ui, TanStack Query                                       |
| Backend            | Node.js 20, Express, TypeScript                                                                  |
| Database           | SQLite (better-sqlite3) + Drizzle ORM                                                            |
| Authentication     | bcryptjs (cost 12), 30-minute access JWT in React memory, 7-day refresh token in httpOnly cookie |
| Secrets encryption | AES-256-GCM, key derived from `ENCRYPTION_KEY`                                                   |
| Excel              | exceljs                                                                                          |
| Containerization   | Docker, Docker Compose (1 service: `api`)                                                        |
| Reverse proxy      | Caddy + HTTPS                                                                                    |
| Security           | Helmet/CSP/HSTS, CORS allowlist, auth/meals rate limits                                          |
| Quality            | Vitest, Supertest, Playwright, ESLint, Prettier, GitHub Actions                                  |
| Timezone           | MSK (UTC+3) — day = 00:00–23:59 MSK                                                              |

## Installation & Setup

### Requirements

- Ubuntu 22.04 / 24.04 LTS
- Docker >= 24 + Docker Compose plugin
- At least 1 GB RAM, 5 GB free disk

### Step 0. Server readiness check

Run the preflight script **from the project directory** (after cloning in step 3). It auto-detects its working directory — no hardcoded paths.

```bash
# Run from the project directory:
sudo bash preflight-check.sh
```

The script checks 11 parameters (OS, RAM, disk, network, Docker, ports, firewall, environment variables, images, API health) and outputs a color-coded report. For automatic fixing of common issues:

```bash
sudo bash preflight-check.sh --fix
```

### Step 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker   # apply without re-login
```

### Step 2. Choose working directory

Pick any directory on the server where the project will live:

```bash
mkdir -p ~/food-diary && cd ~/food-diary
# or any other path, e.g.:
# mkdir -p /srv/foodbot && cd /srv/foodbot
```

### Step 3. Clone the repository

```bash
git clone https://github.com/RazBudimirRus/food-diary-v2.git .
```

### Step 4. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Minimum `.env`:

```env
JWT_SECRET=<random string, at least 40 characters>
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_COOKIE_MAX_AGE=604800
SESSION_IDLE_WARNING_MIN=25
SESSION_IDLE_TIMEOUT_MIN=30
ENCRYPTION_KEY=<random string, at least 40 characters>
PUBLIC_URL=https://fooddiary.razbudimir.com
ALLOWED_ORIGINS=https://fooddiary.razbudimir.com
TRUST_PROXY=1
# ADMIN_BOOTSTRAP_USERNAME=<existing username for admin role>
DEEPSEEK_DAILY_TOKEN_LIMIT=100000
DEEPSEEK_INPUT_USD_PER_M_TOKENS=0.27
DEEPSEEK_OUTPUT_USD_PER_M_TOKENS=1.10
```

Generate values on the server:

```bash
openssl rand -hex 32   # for JWT_SECRET
openssl rand -hex 32   # for ENCRYPTION_KEY
```

### Step 5. Start

```bash
docker compose up -d --build
```

### Local development and checks

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e` builds the app, starts the production server on `127.0.0.1:5174`,
and runs the Playwright smoke flow. On first run, you may need `npx playwright install chromium`.

Check status:

```bash
docker compose ps
docker compose logs -f
```

### Step 6. Access

| Service    | URL                                   |
| ---------- | ------------------------------------- |
| Web form   | `http://<server_ip>:5000`             |
| API health | `http://<server_ip>:5000/api/auth/me` |

On first visit click **"Register"** to create an account.

### Step 7 (optional). Caddy + custom domain

Uncomment the domain block in `Caddyfile` and add Caddy to `docker-compose.yml`:

```yaml
caddy:
  image: caddy:2-alpine
  container_name: food_caddy
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
    - caddy_data:/data
    - caddy_config:/config
  networks:
    - food_net
  depends_on:
    - api
```

Add to the `volumes` section:

```yaml
caddy_data:
caddy_config:
```

### Update

```bash
cd <project-dir>
git pull
docker compose up -d --build
```

### Database backup

```bash
# Manual backup
cp <project-dir>/data/data.db /backup/data-$(date +%Y%m%d_%H%M%S).db

# Automated (cron, daily at 03:00)
echo "0 3 * * * cp <project-dir>/data/data.db /backup/data-\$(date +\%Y\%m\%d).db" | crontab -
```

## Usage

### Web Form

1. Open `http://<server>:5000`
2. On first visit click **"Register"** → enter username, email and password
3. After login — use arrow buttons in the header to navigate between dates (future dates are disabled)
4. Click **"Add meal"** → fill out the form
5. To fix an entry, click **"Edit"** on the meal card, update the fields, and save
6. Click **"Report"** in the header → if day summary isn't filled yet, a dialog opens (wake/bedtime/sport/steps). On repeat downloads the dialog is skipped
7. File downloads as `Дневник_питания_YYYY-MM-DD.xlsx`
8. To log out — click the **logout button** in the header

> **Important:** one day = 00:00–23:59 MSK (UTC+3). Entries always use Moscow time regardless of the device's timezone.

## Project Structure

```
food-diary-v2/
├── client/                      # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── AuthPage.tsx     # Login / register page
│       │   └── DiaryPage.tsx    # Main diary interface
│       ├── lib/
│       │   ├── auth.tsx         # AuthProvider + useAuth hook
│       │   └── queryClient.ts   # API client (TanStack Query)
│       └── components/ui/       # shadcn/ui components
│
├── server/                      # Node.js backend (Express)
│   ├── auth.ts                  # access JWT, refresh cookies, bcrypt, AES-256-GCM, requireAuth
│   ├── routes.ts                # REST API endpoints
│   ├── storage.ts               # Drizzle ORM + SQLite
│   └── excel.ts                 # Excel report generator
│
├── shared/
│   └── schema.ts                # Drizzle schema (users, secrets, days, meals)
│
├── test/                        # Vitest unit/integration tests
├── tests/e2e/                   # Playwright E2E smoke tests
│
├── bot/                         # (unused in V1, reserved for V2)
│
├── docker-compose.yml           # Single service: api
├── Dockerfile.api               # Node.js container
├── Caddyfile                    # Reverse proxy config
├── preflight-check.sh           # Pre-install server readiness check
├── DEPLOY.md                    # Detailed deploy guide (RU)
└── .env.example                 # Environment variables template
```

## API Reference

| Method | Endpoint                |  Auth  | Description                                     |
| ------ | ----------------------- | :----: | ----------------------------------------------- |
| POST   | `/api/auth/register`    |   —    | Register a new user                             |
| POST   | `/api/auth/login`       |   —    | Login: access token in JSON + refresh cookie    |
| POST   | `/api/auth/refresh`     | cookie | Refresh access token from refresh cookie        |
| POST   | `/api/auth/logout`      | cookie | Logout: revokes refresh token and clears cookie |
| GET    | `/api/auth/me`          |   ✅   | Current user info                               |
| GET    | `/api/secrets`          |   ✅   | List saved secrets                              |
| PUT    | `/api/secrets/:name`    |   ✅   | Save/update secret (encrypted)                  |
| GET    | `/api/days/:date`       |   ✅   | Day data + meals (YYYY-MM-DD)                   |
| POST   | `/api/meals`            |   ✅   | Add meal entry                                  |
| DELETE | `/api/meals/:id`        |   ✅   | Delete entry                                    |
| PATCH  | `/api/meals/:id`        |   ✅   | Update entry                                    |
| POST   | `/api/days/:id/summary` |   ✅   | Save day summary                                |
| GET    | `/api/report/:date`     |   ✅   | Download Excel (202 if summary needed)          |
| GET    | `/api/analytics/summary` |   ✅   | Nutrition analytics summary for a date range    |
| GET    | `/api/now`              |   —    | Current MSK date and time                       |

## Roadmap

- [x] Phase 6: HTTPS + Caddy deployment
- [x] Phase 3: SQLite persistence, WAL mode, backups
- [x] Phase 10: access/refresh session lifecycle + idle timeout
- [x] Phase 2: security hardening and audit fixes
- [x] Phase 1: tests, linting, E2E smoke, CI
- [x] UX-1: edit existing meal entries
- [x] Phase 4: admin panel MVP
- [x] Phase 9: DeepSeek usage alerting / daily limit blocking
- [x] Phase 11: analytics dashboard MVP
- [x] UX-2: admin username visibility
- [x] UX-3: move meals between days when editing
- [x] UX-4: explicit wake/sleep dates
- [x] UX-5: calendar analytics periods

## Changelog

### [1.13.0] — 2026-06-27

**feat: UX-2…UX-5 admin, meal move, sleep dates, calendar analytics**

- Admin panel shows `username` as the primary identifier in users/sessions tables
- Meal edit allows changing date; `PATCH /api/meals/:id` moves records between days
- Day summary stores `wakeDate`/`sleepDate`; Excel and analytics use explicit date+time sleep math
- Analytics uses calendar week/month/year periods with empty-day padding and prev/next navigation
- Added `shared/dates.ts`, unit/integration coverage, updated E2E edit flow

### [1.12.0] — 2026-06-27

**feat: Phase 11 analytics dashboard MVP**

- Added `/api/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Aggregates meals, calories, macros, water, hunger/satiety, sleep and steps per day
- Added `/#/analytics` page with period switches, summary cards and Recharts charts
- Added integration coverage for analytics auth and per-user aggregates

### [1.11.0] — 2026-06-27

**feat: Phase 9 DeepSeek daily limit guard**

- Blocks `/api/analyze` with `429` when `DEEPSEEK_DAILY_TOKEN_LIMIT` is reached
- Returns structured limit status without calling DeepSeek after the limit is reached
- Shows blocked/allowed analysis status in the admin DeepSeek usage card
- Added integration coverage for daily limit blocking

### [1.10.0] — 2026-06-27

**feat: Phase 4 DeepSeek usage dashboard**

- Added `api_usage` storage for DeepSeek token and cost tracking
- Records DeepSeek prompt/completion tokens after successful nutrition analysis
- Added admin DeepSeek usage summary with daily token limit status
- Added dashboard cards and recent daily usage table to `/#/admin`
- Added integration coverage for admin usage access
- External notifications remain planned for Phase 9

### [1.9.0] — 2026-06-27

**feat: Phase 4 admin password reset**

- Added admin user list endpoint and UI table
- Added admin password reset action that returns a one-time temporary password
- Revokes the selected user's refresh sessions after password reset
- Added integration coverage for admin reset permissions and new-password login
- Phase 4 still has DeepSeek usage dashboard/alerts pending

### [1.8.0] — 2026-06-27

**feat: Phase 4 session management**

- Added admin API actions to revoke one refresh session or all sessions for a user
- Added session management buttons to the guarded admin page
- Added integration coverage for admin session revoke permissions and behavior
- Phase 4 still has password reset and DeepSeek dashboard slices pending

### [1.7.0] — 2026-06-27

**feat: Phase 4 admin foundation**

- Added `user/admin` roles, admin JWT payloads, and `requireAdmin` middleware for `/api/admin/*`
- Added `ADMIN_BOOTSTRAP_USERNAME` startup bootstrap for promoting an existing user to admin
- Added read-only `/api/admin/sessions` based on active refresh sessions
- Added a guarded `/#/admin` page with an active sessions table
- Added integration coverage for admin vs non-admin access

### [1.6.0] — 2026-06-27

**feat: edit existing meal entries**

- Added an **Edit** action next to delete on meal cards
- The edit form opens with current entry values and saves through `PATCH /api/meals/:id`
- The current day's TanStack Query cache is updated after saving
- Expanded PATCH integration coverage and E2E add → edit → verify coverage

### [1.5.0] — 2026-06-27

**feat: session lifecycle, security hardening, and CI quality gates**

- Added refresh token table, hashed refresh tokens, 30-minute access JWTs, 7-day httpOnly refresh cookies
- Added `/api/auth/refresh`; login/register/logout now rotate or revoke refresh sessions
- React keeps access tokens in memory and refreshes them through the API client
- Added frontend idle warning/logout timers (25/30 minutes)
- Added Helmet/CSP/HSTS, CORS allowlist, rate limits for login and meal creation
- Fixed IDOR in day summary updates and strict Zod validation for meal updates
- Removed full JSON API response bodies from logs
- Added Vitest unit tests, Supertest integration tests, Playwright E2E smoke test, ESLint, Prettier, Husky, lint-staged
- Added GitHub Actions CI and Dependabot config

### [1.4.0] — 2026-06-26

**feat: HTTPS deployment and SQLite persistence**

- Added Caddy reverse proxy with HTTPS support
- Added secure cookie/proxy configuration for production
- Enabled SQLite WAL mode and backup scripts
- Added backup cron installer and deployment preflight checks

### [1.2.0] — 2026-06-26

**feat: remove Telegram bot, add authentication and encrypted secrets**

- Removed Telegram bot (`bot/` service) from Docker Compose — now single `api` service
- Added `users` table: username, email, `passwordHash` (bcryptjs cost 12)
- Added `secrets` table: per-user encrypted key-value storage (AES-256-GCM)
- Added JWT authentication via httpOnly cookie (7-day expiry, sameSite: lax)
- New endpoints: `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `GET /api/auth/me`
- New endpoints: `GET/PUT/DELETE /api/secrets/:name`
- `requireAuth` middleware — all `/api/*` routes are now protected
- New frontend page: `AuthPage.tsx` — login + register tabs (shadcn/ui)
- `AuthProvider` context + `useAuth` hook in `client/src/lib/auth.tsx`
- Logout button and username display in `DiaryPage` header
- Updated `.env.example`: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENCRYPTION_KEY` (no `TELEGRAM_BOT_TOKEN`)
- `preflight-check.sh` section 11: replaced Telegram token validation with API health check (`GET /api/auth/me`)

### [1.1.0] — 2026-06-25

**feat: preflight-check.sh — server readiness script**

- 11-section bash script: OS, RAM, disk, internet, Docker, ports, firewall, env vars, Docker images, compose syntax, Telegram token
- Color output with box-drawing characters, ✔/✘/⚠ symbols
- SUMMARY panel with blockers list and colored verdict (green/yellow/red)
- `--fix` mode: auto-installs Docker, opens firewall ports, creates `.env` from template
- Internet check via `https://hub.docker.com/`

### [1.0.0] — 2026-06-25

**feat: initial MVP**

- React 18 + Vite + Tailwind CSS v3 + shadcn/ui frontend
- Express + TypeScript + Drizzle ORM + SQLite backend
- Meal logging: food, drink, hunger/satiety scale (0–10), meal type, context
- Date navigation (no future dates)
- Day summary dialog: wake time, bedtime, sport, steps, comment
- Excel report generator (exceljs) — doctor format, 7 columns, hunger scale legend, auto-totals
- Docker Compose: `api` (Node.js) + `bot` (Python/aiogram 3) services
- MSK timezone (UTC+3) — day boundary at 00:00–23:59 MSK
- Bilingual README (RU/EN) with architecture diagram and full install guide

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for health tracking · <a href="https://github.com/RazBudimirRus">@RazBudimirRus</a>
</div>
