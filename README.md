# Food Diary V2

> Персональный веб-сервис дневника питания для врачебного наблюдения.

[![CI](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-2.22.1-blue)
![Tests](https://img.shields.io/badge/tests-305%20passed-brightgreen)
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
| Ручной приоритет целевых КБЖУ — не перезаписывать вручную (UX-20)            | ✅     |
| Excel-отчёт за день / неделю / месяц / произвольный период (Фаза 21)         | ✅     |
| PDF-аналитика за период: обложка, KPI, бар-чарт, таблица по дням (UX-22)     | ✅     |
| Аналитика питания (графики, статистика, периоды до 12 мес.)                  | ✅     |
| Каталог продуктов пользователя с inline-bookmark                             | ✅     |
| Фото приёмов пищи (до 5 на приём, UX-17) в VK Object Storage (S3)            | ✅     |
| Фото в карточках дневника и Excel-отчёте (UX-19)                             | ✅     |
| Кабинет врача: пациенты, дневники, планы питания                             | ✅     |
| Аудит-лог действий врача и администратора                                    | ✅     |
| Административная панель                                                      | ✅     |
| Тест S3 round-trip из AdminPage (PutObject → GetObject → DeleteObject)       | ✅     |
| Push-уведомления (Web Push / VAPID)                                          | ✅     |
| CSRF-защита (double-submit cookie)                                           | ✅     |
| EXIF strip при загрузке фото                                                 | ✅     |
| 152-ФЗ: экспорт и удаление данных пользователя                               | ✅     |
| Счётчик воды с учётом напитков из поля «Что пил» (BUG-02)                    | ✅     |
| Idempotency-Key для создания приёмов (UX-17)                                 | ✅     |
| Редактирование приёма — bottom sheet на мобиле (UX-10)                       | ✅     |
| Версия приложения в футере и «О приложении» (UX-13)                          | ✅     |
| Preflight-check скрипт                                                       | ✅     |
| API-документация (Swagger UI) `/api/docs`                                    | ✅     |
| Docker Compose (production + dev)                                            | ✅     |
| Prometheus metrics `/metrics` + `/api/health` с S3 round-trip                | ✅     |
| Pino structured logging + Sentry error tracking                              | ✅     |
| Drizzle-kit versioned migrations (0000–0008)                                 | ✅     |

## Стек

| Слой           | Технологии                                                               |
| -------------- | ------------------------------------------------------------------------ |
| Frontend       | React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query |
| Backend        | Node.js 20 · Express · TypeScript · Drizzle ORM · better-sqlite3         |
| Инфраструктура | Docker Compose · nginx · Ubuntu 24.04                                    |
| Безопасность   | bcryptjs · JWT · AES-256-GCM · CSRF · EXIF strip · ClamAV                |
| AI             | DeepSeek API (анализ КБЖУ)                                               |
| Хранилище      | SQLite (данные) · VK Object Storage / S3 (фото)                          |
| Мониторинг     | Prometheus · Grafana · Sentry · Pino                                     |
| Тесты          | Vitest · Supertest · Playwright E2E · 305 тестов                         |

## Архитектура

```
client/          — React SPA (Vite)
  src/
    components/  — UI компоненты (shadcn/ui + кастомные)
    pages/       — Страницы приложения
    hooks/       — Кастомные React хуки
    lib/         — Утилиты (auth, queryClient, diary-utils, theme-context)
server/          — Express backend
  routes/        — API роуты по доменам (auth, meals, doctor, admin, photos, reports, catalog)
  repositories/  — Репозитории (тонкие обёртки над storage)
  utils/         — Вспомогательные утилиты (liquid.ts — парсинг жидкостей)
  config.ts      — Именованные константы
  storage.ts     — Drizzle ORM + SQLite
  auth.ts        — JWT, bcrypt, middleware
  deepseek.ts    — DeepSeek API интеграция
  s3.ts          — VK Object Storage (S3)
  excel.ts       — ExcelJS отчёты
  openapi.ts     — OpenAPI 3.0 спека
shared/          — Общий код (schema, types, dates)
  schema/        — Drizzle tables, Zod validators, TypeScript types
  dates.ts       — MSK timezone утилиты
docs/
  adr/           — Architectural Decision Records
migrations/      — Drizzle migrations (0000–0008)
test/
  unit/          — Unit тесты (Vitest + Supertest)
  integration/   — Интеграционные тесты
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
ssh user@95.163.213.45
cd /srv/foodbot
git pull origin main
sudo docker compose -f docker-compose.prod.yml up -d --build
curl https://fooddiary.razbudimir.com/api/health | jq
```

> **Важно при первом деплое на существующую БД:** если `__drizzle_migrations` не содержит записей для всех миграций (0000–0008), контейнер упадёт с `duplicate column name`. Решение описано в [BUG-03 в ROADMAP.md](ROADMAP.md).

### Переменные окружения (.env)

| Переменная                                                 | Описание                                     | Обязательна |
| ---------------------------------------------------------- | -------------------------------------------- | ----------- |
| `PORT`                                                     | Порт сервера (default: 5000)                 | —           |
| `NODE_ENV`                                                 | `production` / `development`                 | ✅          |
| `DOMAIN`                                                   | Домен приложения                             | ✅          |
| `PUBLIC_URL`                                               | Полный URL (https://...)                     | ✅          |
| `ALLOWED_ORIGINS`                                          | CORS whitelist (через запятую)               | ✅          |
| `JWT_SECRET`                                               | Секрет для подписи JWT (≥ 32 символа)        | ✅          |
| `JWT_EXPIRES_IN`                                           | TTL access token (default: `30m`)            | —           |
| `JWT_REFRESH_EXPIRES_IN`                                   | TTL refresh token (default: `7d`)            | —           |
| `ENCRYPTION_KEY`                                           | 32-байтный ключ AES-256-GCM                  | ✅          |
| `DEEPSEEK_API_KEY`                                         | API ключ DeepSeek                            | ✅          |
| `DEEPSEEK_DAILY_TOKEN_LIMIT`                               | Лимит токенов в сутки                        | —           |
| `VK_S3_ENDPOINT`                                           | Endpoint VK Object Storage                   | —           |
| `VK_S3_BUCKET`                                             | Имя bucket                                   | —           |
| `VK_S3_REGION`                                             | Регион (default: `ru-msk`)                   | —           |
| `VK_S3_ACCESS_KEY` / `VK_S3_SECRET_KEY`                    | S3 credentials                               | —           |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push VAPID                               | —           |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`      | Email (reset password)                       | —           |
| `ADMIN_BOOTSTRAP_USERNAME`                                 | Имя пользователя для авто-повышения до admin | —           |
| `TRUST_PROXY`                                              | `1` за nginx / reverse proxy                 | —           |
| `LOG_LEVEL`                                                | Pino log level (default: `info`)             | —           |
| `SENTRY_DSN`                                               | Sentry DSN для error tracking                | —           |

## Тесты

```bash
npm test                          # все тесты
npx vitest run --reporter=verbose # с детальным выводом
npx tsc --noEmit                  # typecheck
```

Текущее покрытие: **291 тест**, все проходят.

## API документация

Swagger UI: [`https://fooddiary.razbudimir.com/api/docs`](https://fooddiary.razbudimir.com/api/docs)

Health check: [`https://fooddiary.razbudimir.com/api/health`](https://fooddiary.razbudimir.com/api/health)

Prometheus metrics: `https://fooddiary.razbudimir.com/metrics`

## Архитектурные решения

Решения зафиксированы в `docs/adr/`:

- [ADR-001](docs/adr/ADR-001-sqlite-vs-postgres.md) — SQLite vs PostgreSQL
- [ADR-002](docs/adr/ADR-002-bcryptjs-vs-argon2.md) — bcryptjs vs argon2
- [ADR-003](docs/adr/ADR-003-wouter-vs-react-router.md) — wouter vs react-router
- [ADR-004](docs/adr/ADR-004-monorepo-structure.md) — монорепо без Turborepo

## Changelog

| Версия  | Дата       | Что вошло                                                                    |
| ------- | ---------- | ---------------------------------------------------------------------------- |
| v2.22.0 | 2026-07-05 | Фаза 21 (Excel за неделю/месяц), UX-22 (PDF аналитика), E2E фикс, 305 тестов |
| v2.22.1 | 2026-07-05 | Hotfix: кириллица в PDF — Inter TTF встроен в Docker-образ, 305 тестов       |
| v2.21.0 | 2026-07-05 | BUG-02: parseLiquidMl + waterMl, migration 0008, 291 тест                    |
| v2.20.0 | 2026-07-05 | Фазы 26+27+UX-17/19/20, BUG-01, S3 health round-trip, AdminPage S3 тест      |
| v2.19.0 | 2026-07-05 | UX-6/8/9 (день недели, футер, PrivacyPage)                                   |
| v2.18.0 | 2026-07-05 | UX-14/15/16 (defaultDate, порядок формы, фото при создании)                  |
| v2.17.0 | 2026-07-05 | UX-7/10/11/12/13 (каталог, bottom sheet, bookmark, batch КБЖУ)               |
| v2.12.0 | 2026-06-30 | Рефакторинг монолитов, repositories, OpenAPI, ADR                            |
| v2.11.0 | 2026-07-01 | Audit log, CSRF, EXIF, bottom sheet UX, E2E тест-кейсы                       |
| v2.10.0 | 2026-06-30 | Drizzle-kit migrations, pino, Sentry, /health, /metrics, nginx hardening     |

Полная история: [ROADMAP.md](ROADMAP.md)

## Roadmap (краткий)

| Приоритет | Задача  | Описание                                  |
| --------- | ------- | ----------------------------------------- |
| Высокий   | Фаза 25 | GigaChat как резерв DeepSeek              |
| Высокий   | UX-18   | AI-анализ КБЖУ по фото блюда              |
| Высокий   | UX-22   | PDF-экспорт аналитики (вместо Ctrl+P)     |
| Средний   | UX-21   | Расчёт КБЖУ для позиций каталога через AI |
| Средний   | Фаза 19 | AI-советник «Как добрать КБЖУ?»           |
| Средний   | Фаза 22 | FatSecret API — база продуктов            |

Подробный roadmap со всеми фазами и UX-задачами: [ROADMAP.md](ROADMAP.md)

## Лицензия

MIT © 2026 Глеб Сердитых
