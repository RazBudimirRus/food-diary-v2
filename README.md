# Food Diary V2

> Персональный веб-сервис дневника питания для врачебного наблюдения.

[![CI](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-2.12.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Возможности

| Функция                                                                      | Статус |
| ---------------------------------------------------------------------------- | ------ |
| Дневник питания (завтрак / обед / перекус / ужин)                            | ✅     |
| Авторизация: bcrypt + JWT (30 мин) + refresh token (7 дней, httpOnly cookie) | ✅     |
| Шифрование секретов AES-256-GCM                                              | ✅     |
| Запись задним числом с date-picker (дефолт — сегодня МСК)                    | ✅     |
| Расчёт КБЖУ через DeepSeek API                                               | ✅     |
| Пакетный расчёт КБЖУ по всему дню (UX-12)                                    | ✅     |
| Excel-отчёт за день / произвольный период                                    | ✅     |
| Аналитика питания (графики, статистика)                                      | ✅     |
| Каталог продуктов пользователя                                               | ✅     |
| Фото приёмов пищи в VK Object Storage (S3)                                   | ✅     |
| Кабинет врача: пациенты, дневники, планы питания                             | ✅     |
| Аудит-лог действий врача и администратора                                    | ✅     |
| Административная панель                                                      | ✅     |
| Push-уведомления (Web Push / VAPID)                                          | ✅     |
| CSRF-защита (double-submit cookie)                                           | ✅     |
| EXIF strip при загрузке фото                                                 | ✅     |
| 152-ФЗ: экспорт и удаление данных пользователя                               | ✅     |
| Редактирование приёма — bottom sheet на мобиле (UX-10)                       | ✅     |
| Версия приложения в футере и «О приложении» (UX-13)                          | ✅     |
| Preflight-check скрипт                                                       | ✅     |
| API-документация (Swagger UI) `/api/docs`                                    | ✅     |
| Docker Compose (production + dev)                                            | ✅     |
| Prometheus metrics `/metrics` + `/api/health`                                | ✅     |
| Pino structured logging + Sentry error tracking                              | ✅     |

## Стек

| Слой           | Технологии                                                               |
| -------------- | ------------------------------------------------------------------------ |
| Frontend       | React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query |
| Backend        | Node.js 20 · Express · TypeScript · Drizzle ORM · better-sqlite3         |
| Инфраструктура | Docker Compose · nginx · Ubuntu 24.04                                    |
| Безопасность   | bcryptjs · JWT · AES-256-GCM · CSRF · EXIF strip                         |
| AI             | DeepSeek API (КБЖУ анализ)                                               |
| Хранилище      | SQLite (данные) · VK Object Storage / S3 (фото)                          |
| Мониторинг     | Prometheus · Grafana · Sentry · Pino                                     |

## Архитектура

```
client/          — React SPA (Vite)
  src/
    components/  — UI компоненты (shadcn/ui + кастомные)
    pages/       — Страницы приложения
    hooks/       — Кастомные React хуки
    lib/         — Утилиты (auth, queryClient, diary-utils)
server/          — Express backend
  routes/        — API роуты по доменам (auth, meals, doctor, admin, photos, reports, catalog)
  repositories/  — Репозитории (тонкие обёртки над storage)
  config.ts      — Именованные константы
  storage.ts     — Drizzle ORM + SQLite
  auth.ts        — JWT, bcrypt, middleware
  deepseek.ts    — DeepSeek API интеграция
  s3.ts          — VK Object Storage (S3)
  openapi.ts     — OpenAPI 3.0 спека
shared/          — Общий код (schema, types, dates)
  schema/        — Drizzle tables, Zod validators, TypeScript types
  dates.ts       — MSK timezone утилиты
docs/
  adr/           — Architectural Decision Records
migrations/      — Drizzle migrations
```

## Быстрый старт (разработка)

```bash
git clone https://github.com/RazBudimirRus/food-diary-v2.git
cd food-diary-v2
cp .env.example .env   # заполнить переменные
npm install
npm run dev            # http://localhost:5000
```

## Production деплой

```bash
ssh <server>
cd /srv/foodbot
git pull origin main
sudo docker compose -f docker-compose.prod.yml up -d --build
curl http://localhost:5000/api/health
```

### Переменные окружения (.env)

| Переменная                                                 | Описание                              | Обязательна |
| ---------------------------------------------------------- | ------------------------------------- | ----------- |
| `PORT`                                                     | Порт сервера (default: 5000)          | —           |
| `NODE_ENV`                                                 | `production` / `development`          | ✅          |
| `DOMAIN`                                                   | Домен приложения                      | ✅          |
| `JWT_SECRET`                                               | Секрет для подписи JWT (≥ 32 символа) | ✅          |
| `JWT_EXPIRES_IN`                                           | TTL access token (default: `30m`)     | —           |
| `JWT_REFRESH_EXPIRES_IN`                                   | TTL refresh token (default: `7d`)     | —           |
| `ENCRYPTION_KEY`                                           | 32-байтный hex-ключ AES-256-GCM       | ✅          |
| `DEEPSEEK_API_KEY`                                         | API ключ DeepSeek                     | ✅          |
| `DEEPSEEK_DAILY_TOKEN_LIMIT`                               | Лимит токенов в сутки                 | —           |
| `VK_S3_ENDPOINT`                                           | Endpoint VK Object Storage            | —           |
| `VK_S3_BUCKET`                                             | Имя bucket                            | —           |
| `VK_S3_ACCESS_KEY` / `VK_S3_SECRET_KEY`                    | S3 credentials                        | —           |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push VAPID                        | —           |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`      | Email (reset password)                | —           |
| `LOG_LEVEL`                                                | Pino log level (default: `info`)      | —           |
| `TRUST_PROXY`                                              | `1` за nginx                          | —           |

## API документация

Swagger UI доступен по адресу: `http://localhost:5000/api/docs`

В production: `https://fooddiary.razbudimir.com/api/docs`

## Архитектурные решения

Решения зафиксированы в `docs/adr/`:

- [ADR-001](docs/adr/ADR-001-sqlite-vs-postgres.md) — SQLite vs PostgreSQL
- [ADR-002](docs/adr/ADR-002-bcryptjs-vs-argon2.md) — bcryptjs vs argon2
- [ADR-003](docs/adr/ADR-003-wouter-vs-react-router.md) — wouter vs react-router
- [ADR-004](docs/adr/ADR-004-monorepo-structure.md) — монорепо без Turborepo

## Roadmap

Подробный roadmap с волнами, фазами и UX-задачами: [ROADMAP.md](ROADMAP.md)

| Волна  | Версия  | Статус | Что вошло                                                              |
| ------ | ------- | ------ | ---------------------------------------------------------------------- |
| Wave 1 | v2.10.0 | ✅     | Migrations, nginx hardening, pino, Sentry, /health, /metrics           |
| Wave 2 | v2.11.0 | ✅     | Audit log, CSRF, EXIF, bottom sheet, batch КБЖУ, версия приложения     |
| Wave 3 | v2.12.0 | ✅     | Рефакторинг монолитов, repositories, OpenAPI, ADR, README              |
| Wave 4 | v2.13.0 | 📋     | Тестирование (Playwright E2E, vitest unit, 40% coverage)               |
| Wave 5 | v2.14.0 | 📋     | UX-полировка (undo, skeleton, empty states, a11y)                      |
| Wave 6 | v2.15.0 | 📋     | Продуктовые фичи (weight tracking, PDF, email digest, GigaChat Vision) |

## Лицензия

MIT © 2026 Глеб Сердитых
