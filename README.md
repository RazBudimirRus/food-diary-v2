# 🍽 Дневник питания v2

Веб-приложение для ведения дневника питания с кабинетом врача, AI-расчётом КБЖУ и фото блюд.

[![CI](https://github.com/RazBudimirRus/food-diary-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/RazBudimirRus/food-diary-v2/actions)

---

## Стек технологий

| Слой                 | Технологии                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| **Frontend**         | React 18, Vite 7, TypeScript, Tailwind CSS v3, shadcn/ui, Radix UI, Recharts   |
| **Backend**          | Node.js 20, Express 5, TypeScript, Drizzle ORM                                 |
| **База данных**      | SQLite (better-sqlite3) + versioned migrations (drizzle-kit)                   |
| **Auth**             | bcrypt (cost 12) + JWT (30m access / 7d refresh httpOnly cookie) + AES-256-GCM |
| **AI**               | DeepSeek API — расчёт КБЖУ по текстовому описанию                              |
| **Хранилище фото**   | VK Object Storage (S3-compatible) + sharp (resize, EXIF strip)                 |
| **Push-уведомления** | Web Push (VAPID)                                                               |
| **Логи**             | pino + request_id (AsyncLocalStorage)                                          |
| **Мониторинг**       | Prometheus-совместимые `/metrics`, Sentry/GlitchTip (опционально)              |
| **Прокси**           | Caddy 2 (TLS termination, gzip, security headers)                              |
| **CI/CD**            | GitHub Actions — typecheck, lint, vitest, playwright                           |

---

## Реализованный функционал (v2.9.0)

### Пользователь

- Дневник питания с разбивкой по дням (МСК-часовой пояс)
- Ввод еды, напитков, воды с временными метками и шкалами голода/насыщения
- AI-расчёт КБЖУ (DeepSeek) по текстовому описанию
- Загрузка фото блюд (до 50 МБ, хранение в VK Object Storage)
- Каталог продуктов пользователя (UX-7)
- Аналитика: графики КБЖУ, макронутриентов, воды, сна за период
- Excel-отчёт за день / диапазон дат
- Сброс пароля через email
- Push-уведомления

### Врач

- Кабинет врача: привязка пациентов по поиску, чтение дневников
- Таргеты КБЖУ от врача пациенту
- Заметки врача к приёмам пищи
- Профиль врача (имя, телефон, Telegram)

### Администратор

- Управление пользователями: список, создание, смена роли (user/doctor/admin)
- Мониторинг использования DeepSeek API (токены, стоимость, лимиты)
- Bootstrap первого администратора через `ADMIN_BOOTSTRAP_USERNAME` в `.env`

### Профиль пользователя

- Смена отображаемого имени
- Сброс пароля
- Анкета: пол, рост, вес, уровень активности
- Профиль врача (для роли doctor)
- Дата последнего входа

### Безопасность

- Helmet.js (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- CORS allow-list через `ALLOWED_ORIGINS`
- Rate limiting на аутентификацию и расчёт КБЖУ
- Идемпотентность POST /api/meals (заголовок `Idempotency-Key`)
- Caddy: HSTS preload, Referrer-Policy, Permissions-Policy, -Server

---

## Быстрый старт (Docker)

### 1. Клонировать и настроить

```bash
git clone https://github.com/RazBudimirRus/food-diary-v2.git
cd food-diary-v2
cp .env.example .env
# Отредактировать .env — заменить DOMAIN, JWT_SECRET, ENCRYPTION_KEY
```

### 2. TLS-сертификат

```bash
# Wildcard-сертификат (*.razbudimir.com уже есть на сервере):
mkdir -p certs
cp /path/to/fullchain.pem certs/
cp /path/to/privkey.pem   certs/
```

### 3. Запустить

```bash
docker compose up -d
# Приложение доступно на https://<DOMAIN>
```

### 4. Создать первого администратора

```bash
# В .env: ADMIN_BOOTSTRAP_USERNAME=your_username
docker compose restart api
```

---

## Разработка локально

```bash
npm install
cp .env.example .env
# Заполнить минимальный .env для dev (JWT_SECRET, ENCRYPTION_KEY)

npm run dev       # Frontend + Backend на :5000
npm run typecheck # TypeScript проверка
npm test          # Vitest unit-тесты
npm run test:e2e  # Playwright E2E (требует билда)
```

---

## Структура проекта

```
food-diary-v2/
├── client/              # React 18 фронтенд
│   └── src/
│       ├── pages/       # AuthPage, DiaryPage, AdminPage, DoctorPage, ProfilePage, AnalyticsPage…
│       ├── components/  # shadcn/ui компоненты + BottomNav, ErrorBoundary
│       └── lib/         # auth.tsx, queryClient.ts, dates.ts
├── server/              # Node.js + Express бэкенд
│   ├── index.ts         # Точка входа: migrations → pino → express → routes
│   ├── routes.ts        # Все API роуты (~1100 строк)
│   ├── storage.ts       # Drizzle ORM + SQLite (~1500 строк)
│   ├── migrate.ts       # Drizzle-kit migration runner (Phase 26.1)
│   ├── logger.ts        # pino + AsyncLocalStorage request_id (Phase 27.1)
│   ├── metrics.ts       # Prometheus /metrics (Phase 27.4)
│   ├── sentry.ts        # Sentry/GlitchTip опционально (Phase 27.3)
│   ├── deepseek.ts      # DeepSeek API клиент
│   ├── s3.ts            # VK Object Storage (AWS SDK v3)
│   └── auth.ts          # JWT, bcrypt, refresh-token логика
├── shared/
│   ├── schema.ts        # Drizzle + Zod схемы (16 таблиц)
│   └── dates.ts         # MSK timezone утилиты
├── migrations/          # SQL-миграции (drizzle-kit generate)
├── scripts/             # backup.sh, preflight.sh
├── Caddyfile            # Caddy конфигурация (TLS, security headers)
├── docker-compose.yml   # api + caddy сервисы
├── Dockerfile.api       # Multi-stage build
└── .env.example         # Все переменные с комментариями
```

---

## API Endpoints (ключевые)

| Метод   | Путь                              | Доступ | Описание                                        |
| ------- | --------------------------------- | ------ | ----------------------------------------------- |
| GET     | `/api/health`                     | Public | Проверка БД / S3 / DeepSeek                     |
| GET     | `/api/metrics`                    | Public | Prometheus метрики                              |
| POST    | `/api/auth/register`              | Public | Регистрация                                     |
| POST    | `/api/auth/login`                 | Public | Вход                                            |
| GET     | `/api/days`                       | Auth   | Список дней                                     |
| POST    | `/api/meals`                      | Auth   | Добавить приём (поддерживает `Idempotency-Key`) |
| POST    | `/api/meals/:id/analyze`          | Auth   | Расчёт КБЖУ (DeepSeek)                          |
| POST    | `/api/photos`                     | Auth   | Загрузить фото блюда                            |
| GET     | `/api/report/:date`               | Auth   | Excel за день                                   |
| GET     | `/api/report/range`               | Auth   | Excel за диапазон                               |
| GET/PUT | `/api/profile`                    | Auth   | Профиль пользователя                            |
| GET     | `/api/doctor/patients`            | Doctor | Список пациентов                                |
| POST    | `/api/doctor/patients/:id/assign` | Doctor | Привязать пациента                              |
| GET     | `/api/admin/users`                | Admin  | Список пользователей                            |
| POST    | `/api/admin/users/:id/set-role`   | Admin  | Сменить роль                                    |

---

## Мониторинг и логи

```bash
# Структурированные логи (pino JSON)
docker compose logs -f api | jq .

# Prometheus метрики
curl http://localhost:5000/metrics

# Healthcheck
curl https://fooddiary.razbudimir.com/api/health
```

### Grafana Dashboard

Метрики доступны для импорта в существующий Grafana на том же сервере:

- `http_requests_total` — RPS по роутам
- `http_request_duration_ms` — latency percentiles
- `deepseek_api_calls_total` — использование AI
- Стандартные Node.js метрики (heap, GC, event loop)

---

## Переменные окружения

Полный список с комментариями: [`.env.example`](.env.example)

Обязательные для продакшена:

| Переменная         | Описание                                                 |
| ------------------ | -------------------------------------------------------- |
| `DOMAIN`           | Домен (без https://)                                     |
| `JWT_SECRET`       | Мин. 32 символа — `openssl rand -hex 32`                 |
| `ENCRYPTION_KEY`   | Мин. 32 символа — `openssl rand -hex 32`                 |
| `DEEPSEEK_API_KEY` | Ключ DeepSeek (опционально)                              |
| `VK_S3_*`          | VK Object Storage (опционально, без него фото отключены) |

---

## Производственный сервер

- **IP:** 95.163.213.45 (VK Cloud, Ubuntu 24.04)
- **Домен:** [fooddiary.razbudimir.com](https://fooddiary.razbudimir.com)
- **TLS:** Wildcard `*.razbudimir.com` (истекает 05.03.2027)
- **Данные:** `/srv/foodbot/data/` (volume mount)
- **Бэкапы:** `scripts/backup.sh` — локальные + VK Object Storage

---

## Snapshot-ветка

Текущее состояние на 29.06.2026 зафиксировано в ветке `v2.9.0-snapshot`.  
Все новые изменения идут в `main`.

---

## Лицензия

MIT
