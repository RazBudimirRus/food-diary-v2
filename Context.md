# Context — Food Diary V2 (PROJECT24_FOODDIARY2)

> **ОБЯЗАТЕЛЬНО ДЛЯ ВСЕХ AI-АГЕНТОВ (Cursor, Perplexity, и др.)**
>
> При **каждом** новом чате, задаче или вопросе по этому проекту:
>
> 1. **Сначала прочитай этот файл целиком** (`Context.md`).
> 2. Затем при необходимости — `ROADMAP.md` (актуальный бэклог — в разделе «Таблица приоритетов фаз» внизу) и `README.md` (установка/API).
> 3. После выполнения значимых изменений **обнови раздел «Журнал изменений»** внизу этого файла.
> 4. Не смотри в `.env` (секреты). Используй только `.env.example`.
>
> Путь к проекту: `c:\Users\user\OneDrive\Документы\CURSOR\APPLICATIONS\PROJECT24_FOODDIARY2`

---

## Проект

| Поле                | Значение                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Название            | Food Diary V2                                                                               |
| Текущая версия      | **2.27.0** (`package.json`)                                                                 |
| Назначение          | Дневник питания + Excel/PDF-отчёт для врача/нутрициолога                                    |
| GitHub              | https://github.com/RazBudimirRus/food-diary-v2                                              |
| Локальная папка     | `APPLICATIONS/PROJECT24_FOODDIARY2` внутри workspace CURSOR                                 |
| Домен               | `fooddiary.razbudimir.com`                                                                  |
| **Прод-сервер**     | `149.33.12.166` · Ubuntu 24.04 · wildcard `*.razbudimir.com`                                |
| Путь на проде       | `/srv/foodbot` — так во всех compose-файлах, `backup.sh`, `preflight-check.sh`, `DEPLOY.md` |
| Исходная разработка | Perplexity MAX (Computer mode), далее — Cursor Agent                                        |

---

## Стек

- **Frontend:** React 18, Vite 7, Tailwind 3, shadcn/ui (Radix), TanStack Query, wouter (hash routing), Recharts
- **Backend:** Node.js 22, Express 5, TypeScript 5.6, Drizzle ORM, SQLite (better-sqlite3, WAL)
- **Auth:** bcryptjs (cost 12), access JWT 30 мин в памяти + refresh 7 дней в httpOnly cookie, AES-256-GCM для secrets (ключ через scrypt KDF), MFA TOTP для `doctor`/`admin`
- **AI:** DeepSeek API (`deepseek-v4-flash`) — расчёт КБЖУ по тексту и по фото
- **Хранение фото:** VK Object Storage (S3-совместимое) через `@aws-sdk/client-s3`, sharp для EXIF-strip и конвертации
- **Отчёты:** exceljs (Excel), pdfkit + chartjs-node-canvas (PDF-аналитика с графиками)
- **Наблюдаемость:** pino (+ request_id), Sentry, `/api/health`, `/metrics` (prom-client)
- **Deploy:** Docker Compose. `docker-compose.yml` (Caddy + api) или `docker-compose.prod.yml` (внешний nginx, только `api`)
- **Часовой пояс:** МСК (UTC+3), день = 00:00–23:59 MSK. Единая логика — `shared/dates.ts`

---

## Архитектура (после Фазы 29, v2.27.0)

Это самое важное отличие от старых версий контекста: **монолитов `server/routes.ts` и `server/storage.ts` в прежнем виде больше нет.**

```
PROJECT24_FOODDIARY2/
├── client/src/
│   ├── pages/           # Auth, Diary, Analytics, Admin, Doctor, Catalog, Profile, Privacy, About, ResetPassword
│   ├── components/
│   │   ├── diary/       # MealForm, MealCard, MealFields, MealEditSheet, DateCarousel, DaySummary…
│   │   ├── admin/       # AdminUsersTable, AuditLogTab, ClientErrorsTab, DeepSeekUsagePanel, S3AdminPanel
│   │   ├── analytics/   # 8 блоков-графиков + AnalyticsPeriodControls
│   │   ├── doctor/      # PatientsTab, PatientDiaryTab, DoctorHistoryTab
│   │   ├── catalog/     # AddProductDialog, CatalogItemCard, EditCatalogItemDialog
│   │   ├── profile/     # AccountInfoCard, MfaCard, DisplayNameCard, PasswordResetCard
│   │   └── ui/          # shadcn/ui
│   └── lib/             # auth.tsx, diary-utils.ts, errorReporter.ts, theme-context.ts
├── server/
│   ├── app.ts           # createApp(): helmet/CORS/parsers/CSRF/логи/metrics. НЕ открывает БД
│   ├── index.ts         # boot: миграции → createApp() → routes → listen
│   ├── db.ts            # единое подключение SQLite
│   ├── routes/          # 14 файлов: auth, meals, admin, doctor, catalog, photos, reports,
│   │                    # client-errors, push, helpers, limiters, middleware, upload, index
│   ├── repositories/    # 9 репозиториев с реальным SQL: user, meal, day, session,
│   │                    # doctor, catalog, photo, audit, index
│   ├── storage.ts       # фасад над репозиториями + аналитический SQL. БЕЗ bootstrap DDL
│   ├── errors.ts        # ApiError { status, code, message, details }
│   ├── config.ts        # TTL, rate limits, page size, PHOTO_MAX_*
│   ├── deepseek.ts  excel.ts  analytics-pdf.ts  s3.ts  mfa.ts  csrf.ts  audit.ts
│   ├── mail.ts  logger.ts  metrics.ts  sentry.ts  openapi.ts  migrate.ts  static.ts  vite.ts
│   └── __mocks__/       # deepseek mock для тестов
├── shared/
│   ├── schema/          # tables.ts, types.ts, validators.ts, index.ts (Drizzle + Zod)
│   ├── dates.ts         # mskToday, mskNowTime — единственный источник MSK-логики
│   └── analytics.ts
├── migrations/          # 0000_baseline … 0009_client_error_log + meta/
├── test/                # 3 integration + 22 unit + helpers/db.ts
├── docs/adr/            # ADR-001…004 + template
├── bot/                 # Python aiogram — LEGACY, не в docker-compose
└── script/              # build.ts, cold-start-check.ts
```

### Ключевые архитектурные правила

1. **Схема БД создаётся только миграциями** (`migrations/` + `runMigrations`). Никакого `CREATE TABLE`/`ALTER TABLE` в `storage.ts`. Guarded DDL в `migrate.ts` остаётся аварийным fallback — не дублировать в нём схему.
2. **Ошибки в роутах — через `throw ApiError.*()`**, а не `res.status().json()`. Error middleware в `routes/index.ts` маппит их в JSON и пишет 4xx/5xx (кроме 401/403) в `client_errors`.
3. **SQL живёт в `server/repositories/`.** `storage.ts` — фасад; новый прямой SQL в него не добавлять (исключение — аналитические запросы, которые там уже есть).
4. **Магические числа — в `server/config.ts`**, не по месту использования.
5. **Даты MSK — только через `shared/dates.ts`.**
6. **`createApp()` не открывает SQLite** — это позволяет тестировать boot (`test/unit/app-boot.test.ts`).
7. Soft-delete приёмов пищи: у `meals` есть `deleted_at`; все выборки и аналитика обязаны его учитывать.

---

## Состояние на 2026-08-07 (проверено запуском)

| Проверка            | Результат                              |
| ------------------- | -------------------------------------- |
| `npm run typecheck` | ✅ 0 ошибок                            |
| `npm run test`      | ✅ 303 теста в 25 файлах               |
| `npm run lint`      | ✅ 0 ошибок, 3 warning (unused vars)   |
| Git                 | ✅ `main` == `origin/main` (`ac7aa27`) |

Порог coverage в `vitest.config.ts` — **53%** (в ROADMAP исторически фигурирует 55%, был снижен в ходе Фазы 29).

---

## Открытые задачи

**Высокий приоритет:**

| ID          | Проблема                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------- |
| **PERF-01** | Расчёт КБЖУ 5–15 с — `deepseek-v4-flash` генерирует thinking-блок. UX-блокер             |
| **BUG-10**  | Не грузятся фото с мобильного телефона (вероятно HEIC/HEIF или MIME). Причина не найдена |

**Низкий приоритет:** хвост Фазы 29 (`bot/utils/dates.py`), мёртвый Python-бот `bot/`, неиспользуемые npm-зависимости из шаблона Replit.

**Закрыто 2026-08-07 (v2.27.1)** по итогам диагностики прода:

- **BUG-08** — ClamAV удалён из `docker-compose.prod.yml`. На проде контейнер висел `unhealthy` 8+ дней, сокета не было вовсе, скан не выполнялся (fail-open), а `/api/health` писал ~2900 ошибок в сутки. Код `scanForViruses()` в `s3.ts` **оставлен**: он сам включается при заданном `CLAMAV_SOCKET`, поэтому возврат — правка одного compose-файла.
- **BUG-11** — миграция `0009_client_error_log` не была зарегистрирована в `migrations/meta/_journal.json`, из-за чего drizzle её игнорировал, а таблица `client_errors` жила только за счёт guarded DDL. Добавлена запись в журнал + `--> statement-breakpoint` в сам `.sql`.
- `data/` добавлен в `.gitignore` — бэкапы `food-diary_*.db` не попадали под прежние шаблоны, и `git add -A` на сервере мог отправить медданные в публичный репозиторий.
- S3-проверка в `/api/health` теперь кэшируется (`HEALTH_S3_CACHE_MS`, 5 мин) и идёт через лёгкий `pingS3()` без sharp и антивируса.

**Не начатые фазы:** 19 (AI-советник), 22 (FatSecret), 25 (GigaChat), 32 (лендинг/digest), 33 (DR, k6, Postgres), 36 (Health-платформы), 7 (WAF), 12/13 (Android + RuStore), 0 (TG-бот), 8 (масштабирование).

**Прод (проверено 2026-08-07):** развёрнута **v2.27.0**. После v2.27.1 прод отстаёт от `main` — нужен деплой (см. ниже про удаление контейнера ClamAV). `/api/health` → `status: ok`, все проверки зелёные (`db: sqlite ok`, `s3: rw ok ~120ms`, `deepseek: configured`). Фронт отдаётся через `nginx/1.24.0` (Ubuntu), то есть используется `docker-compose.prod.yml`. HSTS и CSP на месте. Uptime на момент проверки ~50 ч → контейнер поднят ~2026-08-05 11:08 MSK, то есть сразу после мержа v2.27.0.

> Версию прода снаружи можно узнать так: взять имя JS-бандла из `curl -sS https://fooddiary.razbudimir.com/`, затем найти в нём строку версии — она вшивается на этапе сборки через `__APP_VERSION__` (см. `vite.config.ts`).

---

## Docker / данные / деплой

- Два compose-файла: `docker-compose.yml` (Caddy + api, HTTPS на том же хосте) и `docker-compose.prod.yml` (внешний nginx, единственный сервис `api`). На проде используется **prod**-вариант.
- SQLite `data.db` в bind mount `/srv/foodbot/data` → `/app/data` в контейнере. Там же `data/backups/` — каталог целиком в `.gitignore`.
- Бэкапы: `scripts/backup.sh` (hot backup), `install-backup-cron.sh` (00:00 UTC = 03:00 MSK), хранится 30 копий. Задание ставится в crontab пользователя (`${SUDO_USER:-$USER}`), поэтому в `sudo crontab -l` его не видно — искать через `crontab -l`, `/etc/cron.d/`.
- **Никогда** не запускать `docker compose down -v`.
- Перед деплоем: `sudo bash preflight-check.sh`. Проверка холодного старта локально: `npx tsx script/cold-start-check.ts`.
- Подробности и порядок обновления — в `DEPLOY.md`.

### Грабли деплоя (реальные инциденты)

- **BUG-03:** рассинхрон `__drizzle_migrations` — миграции применялись guarded DDL без записи хэша, при следующем деплое drizzle пытался применить их повторно. Исправлено вручную вставкой хэшей.
- **BUG-06:** `idempotency_keys` на проде не имела колонок `response_status`/`response_body` — миграция считалась применённой по хэшу. Исправлено вручную `ALTER TABLE`.
- **BUG-11:** число файлов `migrations/*.sql` **не равно** числу применённых миграций — drizzle читает `migrations/meta/_journal.json`, а не каталог. Сравнивать `COUNT(*)` из `__drizzle_migrations` нужно с записями журнала, иначе диагностика даёт ложную тревогу «рассинхрон». Новая миграция без записи в журнале молча не применяется.
- Если раньше собирали под root — перед `git checkout` нужен `sudo chown -R "$USER:$USER" /srv/foodbot`.

---

## Правила для агентов

1. Проект лежит в `APPLICATIONS/PROJECT24_FOODDIARY2`, **не** в корне CURSOR.
2. **Не коммитить без явной просьбы пользователя.**
3. Не читать `.env`.
4. Минимальный diff — не рефакторить несвязанное.
5. Согласовывать изменения с `ROADMAP.md`; при закрытии задачи править статус **в двух местах**: в разделе фазы и в таблице приоритетов внизу.
6. Обновлять «Журнал изменений» в этом файле после значимых изменений.
7. Перед сдачей работы прогонять `npm run typecheck && npm run test && npm run lint`.
8. Windows: `npm run dev` использует `cross-env` для `NODE_ENV`.
9. Схему БД менять только через новую миграцию в `migrations/`, а не правкой существующих.

---

## Рекомендации по выбору модели

| Тип задачи                                      | Модель                              |
| ----------------------------------------------- | ----------------------------------- |
| Инфра: Caddy, docker-compose, bash, backup      | Composer / GPT-5.3 Codex            |
| Security: auth, refresh tokens, CSRF, MFA, IDOR | GPT-5.3 Codex / Opus                |
| Многофайловые фазы, тесты, админка              | Opus / GPT-5.5 Medium               |
| Рефакторинг, чистка зависимостей                | Composer                            |
| Code review / security audit                    | Bugbot / Security Review (subagent) |
| Документация, ROADMAP, Context                  | Composer / Perplexity               |
| Мелкие правки (1 файл, typo)                    | Composer / Gemini Flash             |

**Не использовать быстрые модели для:** auth, refresh tokens, шифрование, CSRF/MFA, миграции БД.

---

## История работы

- **Perplexity MAX** — исходный MVP из шаблона rest-express/Replit: веб-форма, Excel под формат врача, позже auth + DeepSeek.
- **Cursor Agent (июнь 2026)** — Фазы 6, 3, 10, 2, 1, 4, 9, 11, 5; UX-1…UX-5; code review (оценка 6.5/10).
- **Cursor Agent (июль 2026)** — мобильная оптимизация (14), кабинет врача (15), 152-ФЗ (16), анкета (17), профиль питания (20), каталог (UX-7), S3-фото (23), аудит-лог (24), безопасность второго уровня (28: CSRF, MFA, EXIF, ClamAV, scrypt), наблюдаемость (26/27), расширенные отчёты (21), PDF-аналитика (UX-22/22b), AI по фото (UX-18) и по каталогу (UX-21), волны тестирования (30/35).
- **Cursor Agent (август 2026)** — Фаза 29: расщепление монолитов, репозитории с реальным SQL, `ApiError`, `createApp()`, удаление bootstrap DDL.

---

## Журнал изменений Context.md

| Дата       | Кто          | Что                                                                                                                                                                                                                                                                        |
| ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | Cursor Agent | **Полная перезапись под v2.27.0.** Файл был на v2.1 (данные от 27.06) и описывал архитектуру до Фазы 29. Добавлены: реальная структура репозитория, архитектурные правила, статус проверок, открытые задачи, грабли деплоя. Синхронизирована таблица приоритетов в ROADMAP |
| 2026-08-05 | Cursor Agent | Phase 29 v2.27.0 влита в main: User/Doctor repos, ApiError везде, `createApp()`, migrations-only DDL                                                                                                                                                                       |
| 2026-08-04 | Cursor Agent | Phase 29 v2.26.0: `db.ts`, Meal/Day/Session/Catalog/Photo/Audit repos, split Admin/Analytics/MealFields                                                                                                                                                                    |
| 2026-07-27 | Cursor Agent | v2.25.0: фикс DeepSeek, проверка API в админке, серверный лог ошибок, мобильный header                                                                                                                                                                                     |
| 2026-07-25 | Cursor Agent | v2.24.x: `deepseek-v4-flash`, клиентский лог ошибок, S3-статистика, BUG-09 (КБЖУ из каталога)                                                                                                                                                                              |
| 2026-07-06 | Cursor Agent | v2.23.0: UX-18/21 (AI по фото и каталогу), UX-22b (PDF с графиками), Node 22, ADR/OpenAPI                                                                                                                                                                                  |
| 2026-07-05 | Cursor Agent | v2.16.0–v2.22.1: MFA, ClamAV, scrypt, каталог, UX-14/15/16/17/19/20, Фаза 21, PDF, BUG-01/02                                                                                                                                                                               |
| 2026-07-03 | Cursor Agent | v2.12.0–v2.15.0: волны рефакторинга и тестирования, soft-delete + undo                                                                                                                                                                                                     |
| 2026-06-28 | Cursor Agent | v2.5.0–v2.7.0: Фаза 14 (мобильная оптимизация), комплит админ-панели                                                                                                                                                                                                       |
| 2026-06-27 | Cursor Agent | Фазы 1, 4, 5, 9, 11; UX-1…UX-5                                                                                                                                                                                                                                             |
| 2026-06-26 | Cursor Agent | Создан Context.md; Фазы 2, 3, 10; деплой на прод (HTTPS HTTP/2 200 + HSTS)                                                                                                                                                                                                 |

---

_Версия Context.md: 3.0 · Соответствует приложению v2.27.0_
