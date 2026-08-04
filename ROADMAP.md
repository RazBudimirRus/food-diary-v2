# 🗺 Food Diary V2 — RoadMap

**Версия:** 2.6.0  
**Дата обновления:** 6 июля 2026 (v2.23.0)  
**Проект:** Food Diary V2 — веб-сервис дневника питания для врачебного наблюдения  
**Стек:** React 18 + Vite · Node.js 22 + Express + TypeScript + SQLite · Docker Compose · bcrypt + JWT + AES-256-GCM · DeepSeek API  
**Сервер:** Ubuntu 24.04 VPS · `fooddiary.razbudimir.com` · wildcard `*.razbudimir.com`

---

## Статус реализованного (v1.x)

| Функциональность                                                          | Статус    |
| ------------------------------------------------------------------------- | --------- |
| Веб-форма ввода приёмов пищи (еда, напитки, голод/сытость 0–10, контекст) | ✅ Готово |
| Авторизация: регистрация/логин, bcrypt, JWT в httpOnly cookies            | ✅ Готово |
| Шифрованное хранение секретов (AES-256-GCM)                               | ✅ Готово |
| Date-picker: запись задним числом (дефолт — сегодня MSK)                  | ✅ Готово |
| Анализ КБЖУ через DeepSeek API (ккал/Б/Ж/У)                               | ✅ Готово |
| Выгрузка Excel-отчёта для врача с колонкой КБЖУ                           | ✅ Готово |
| `preflight-check.sh` — скрипт проверки перед деплоем                      | ✅ Готово |
| Docker Compose (single `api` service)                                     | ✅ Готово |

---

## Что уже сделано и в какой версии

| Версия / дата        |                   Фаза | Статус         | Что вошло                                                                                                      |
| -------------------- | ---------------------: | -------------- | -------------------------------------------------------------------------------------------------------------- |
| v1.0.0 · 2026-06-25  |                    MVP | ✅ Реализовано | Веб-форма дневника, SQLite, Excel-отчёт, Docker Compose                                                        |
| v1.1.0 · 2026-06-25  |              Preflight | ✅ Реализовано | `preflight-check.sh` для проверки готовности сервера                                                           |
| v1.2.0 · 2026-06-26  |           Auth/secrets | ✅ Реализовано | Регистрация/логин/logout, bcrypt, AES-256-GCM secrets, изоляция userId                                         |
| v1.3.x · 2026-06-26  |       КБЖУ/date-picker | ✅ Реализовано | Date-picker, DeepSeek КБЖУ, колонка КБЖУ в Excel                                                               |
| v1.4.0 · 2026-06-26  |             Фазы 6 + 3 | ✅ Реализовано | HTTPS/Caddy, secure cookies/proxy, SQLite WAL, backup scripts                                                  |
| v1.5.0 · 2026-06-27  |        Фазы 10 + 2 + 1 | ✅ Реализовано | Refresh sessions, idle timeout, Helmet/CORS/rate-limit, IDOR/PATCH fixes, tests/CI                             |
| v1.6.0 · 2026-06-27  |                   UX-1 | ✅ Реализовано | Редактирование приёма пищи через PATCH, обновление Query cache, integration + E2E                              |
| v1.7.0 · 2026-06-27  |      Фаза 4 foundation | ✅ Реализовано | `user/admin` роли, `requireAdmin`, `ADMIN_BOOTSTRAP_USERNAME`, read-only sessions                              |
| v1.8.0 · 2026-06-27  |        Фаза 4 sessions | ✅ Реализовано | Admin revoke одной refresh-сессии или всех refresh-сессий пользователя                                         |
| v1.9.0 · 2026-06-27  |           Фаза 4 reset | ✅ Реализовано | Admin user list + reset password с временным паролем и revoke refresh sessions                                 |
| v1.10.0 · 2026-06-27 | Фаза 4 usage dashboard | ✅ MVP         | `api_usage`, DeepSeek token/cost tracking, dashboard, daily limit status                                       |
| v1.11.0 · 2026-06-27 |     Фаза 9 limit guard | ✅ Реализовано | Блокировка `/api/analyze` при достижении `DEEPSEEK_DAILY_TOKEN_LIMIT`                                          |
| v1.12.0 · 2026-06-27 |      Фаза 11 analytics | ✅ MVP         | `/api/analytics/summary`, cards, Recharts graphs, calories/БЖУ/water/sleep trends                              |
| v1.16.0 · 2026-06-27 | Фаза 11 full analytics | ✅ Реализовано | 6 блоков, insights, 3/6 мес, CSV, sleep debt, gaps, histograms                                                 |
| v1.13.0 · 2026-06-27 |              UX-2…UX-5 | ✅ Реализовано | Admin username, meal day move, wake/sleep dates, calendar analytics periods                                    |
| v1.15.0 · 2026-06-27 |  Фаза 5 password reset | ✅ Реализовано | forgot/reset password by email, SMTP, `/#/reset-password`                                                      |
| v2.5.0 · 2026-06-28  |         Фаза 14 mobile | ✅ Реализовано | BottomNav, PWA, TodayWidget, OnboardingTour, dark mode toggle, keyboard shortcuts                              |
| v2.6.0 · 2026-06-28  |   Bugfix #1–5 + README | ✅ Реализовано | dark theme fix (toggleTheme), header two-row layout, analytics back nav, onboarding mobile pos/localStorage    |
| v2.7.0 · 2026-06-28  |         Фаза 4 комплит | ✅ Реализовано | Подтверждено полное реализование Admin Panel: users, sessions revoke, password reset, DeepSeek usage dashboard |

| v2.25.1 · 2026-08-02 | DeepSeek thinking fix | ✅ Реализовано | content:null при thinking mode |
| v2.27.0 · 2026-08-04 | Phase 29 W0+W1 (branch refactor/v2.27.0) | 🚧 В работе | Real User/Doctor repos; MFA/photos/plans/audit tests; storage delegates all 8 repos |
| v2.26.0 · 2026-08-04 | Phase 29 finish wave 1 | ✅ В main | db.ts, Meal/Day/Session/Catalog/Photo/Audit repos, ApiError, Admin/Analytics/MealFields split |

> Прод-сервер может отставать от `main`: после коммитов Phase 10/2/1 нужен отдельный деплой на VPS.

| v2.10.0 · 2026-06-30 | Волна 1 (26+27) | ✅ Реализовано | drizzle-kit migrations, убран `as any`, nginx hardening, AuthPage toggle пароля, pino логи, /api/health, Sentry, /metrics, prod error handler, README v2 |
| v2.10.x · 2026-06-30 | Production deploy fixes | ✅ Реализовано | Фикс `import.meta.url` в CJS-бандле, копирование `migrations/` в Docker-образ, выравнивание пути БД (`data/data.db`), добавление миграций 0003 и `idempotency_keys` для существующей БД |
| v2.11.0 · 2026-07-01 | Волна 2 (28+UX) | ✅ Реализовано | Аудит-лог (Phase 24), CSRF+EXIF+reset-pw (Phase 28), bottom sheet UX-10, batch КБЖУ UX-12, версия в футере UX-13, E2E тест-кейсы TC-01..TC-14 добавлены в ROADMAP |
| v2.12.0 · 2026-07-03 | Волна 3 (рефакторинг) | ✅ Реализовано | server/routes/ split (13 файлов), server/repositories/ (9 файлов), shared/schema/ split, DiaryPage → 399 строк, config.ts, OpenAPI/Swagger, ADR-001..004, README v2 |
| v2.13.0 · 2026-07-04 | Волна 4 (тестирование) | ✅ Реализовано | 99 тестов (26 integration + 73 unit), coverage 40.1% с threshold, server/**mocks**/deepseek.ts, helpers/meals/diary-utils unit tests, E2E TC-02/03/05/11, миграция 0000 baseline fix |
| v2.14.0 · 2026-07-04 | Волна 5 (тестирование v2) | ✅ Реализовано | 242 теста, coverage 40.1%→56.8%, threshold 55%, repositories/doctor-routes/catalog-routes/mail/csrf/deepseek/user-routes тесты, test helpers factory |
| v2.15.0 · 2026-07-04 | Волна 6 (UX-полировка, Phase 31) | ✅ Реализовано | Soft-delete meals + undo toast (5 сек), skeleton loaders в AnalyticsPage, real-time zod валидация в AuthPage, aria-labels на иконочных кнопках, dark mode toggle в ProfilePage, migration 0005 |
| v2.16.0 · 2026-07-05 | Волна 7 (Phase 28 остаток) | ✅ Реализовано | MFA TOTP для doctor/admin (otpauth, QR-код, login 2nd step), ClamAV antivirus (docker-compose сервис + scan middleware), scrypt KDF для ENCRYPTION_KEY (заменён SHA-256), migration 0006 (mfa_enabled, mfa_secret) |
| v2.17.0 · 2026-07-05 | Волна 8 (UX-7/10/11/12/13) | ✅ Реализовано | CatalogPage /#/catalog + PUT rename, BottomNav «Каталог», UX-11 inline bookmark на foodText/drinkText (Popover), UX-7/10/12/13 подтверждены реализованными |
| v2.17.1 · 2026-07-05 | CI lint fix | ✅ Реализовано | Устранена единственная ошибка CI (no-empty в useTheme.ts), 11 ESLint warnings, useAppTheme вынесен в lib/theme-context.ts |
| v2.18.0 · 2026-07-05 | Волна 9 (UX-14/15/16) | ✅ Реализовано | UX-14: defaultDate в MealForm = выбранный день; UX-15: форма добавления выше списка приёмов; UX-16: фото в форме создания приёма (превью + пост-загрузка после сохранения) |
| v2.19.0 · 2026-07-05 | Волна 10 (UX-6/8/9) | ✅ Реализовано | UX-6/8/9 подтверждены реализованными: день недели в карусели (formatDateWithWeekday), автовысота комментаႈия в Excel (excel.ts:275), футер + PrivacyPage + AboutPage |
| v2.20.0 · 2026-07-05 | Фазы 26+27+UX-17/19/20 + BUG-01 + S3 health | ✅ Реализовано | Drizzle-kit baseline, pino+request_id, /api/health S3 round-trip, /metrics Prometheus, prod error handler, AuthPage UX, idempotency key, UX-17 мультифото, UX-19 фото в карточках+Excel, UX-20 kbju_manual, nginx server_tokens off, POST /api/admin/s3-test, кнопка S3 в AdminPage, BUG-01 исправлен, ROADMAP BUG-01/BUG-02, 257 тестов |
| v2.21.0 · 2026-07-05 | BUG-02 счётчик воды | ✅ Реализовано | parseLiquidMl + mealWaterMl утилиты, migration 0008 (water_ml в meals), обновлён DiaryPage/excel/storage для нового поля, фазы 26/27 в ROADMAP → ✅, 291 тест |
| v2.22.0 · 2026-07-05 | Фаза 21 + UX-22 + E2E fix | ✅ Реализовано | Фаза 21: GET /api/report/week + /month (Excel за неделю/месяц), кнопка «За месяц» в DiaryHeader. UX-22: GET /api/report/analytics-pdf + кнопка PDF в AnalyticsPage (многостраничный отчёт: обложка KPI, бар-чарт, таблица по дням). E2E: playwright.config.ts timeout 30s→60s + retries:1, waitForLoadState(«networkidle»), timeout 15s на expect. 15 новых тестов, 305 всего |
| v2.22.1 · 2026-07-05 | Hotfix: кириллица в PDF | ✅ Реализовано | Встраивание Inter TTF (Regular + Bold, 398K + 406K) в Docker-образ через Dockerfile.api. Шрифты копируются из server/fonts/ → /app/server/fonts/ в production-образе. Fallback: runtime-загрузка с GitHub + Helvetica при отсутствии интернета. 305 тестов |
| v2.23.0 · 2026-07-06 | UX-17/18/19/21/22b + BUG-04/05 | ✅ Реализовано | **UX-21**: AI-расчёт КБЖУ для позиций каталога (POST /api/catalog/:id/calculate-kbju, кнопка Sparkles в CatalogPage). **UX-17**: мультифото до 5 шт + превью в MealForm (уже было). **UX-18**: AI-расчёт КБЖУ по записи с фото (POST /api/meals/:id/analyze-kbju, кнопка Sparkles в MealCard). **UX-19**: фото-thumbnails в карточках + лайтбокс + Excel-экспорт (уже было). **UX-22b**: полноценный PDF-отчёт с 7 страницами и реальными графиками через chartjs-node-canvas (сон, КБЖУ, перерывы, голод/насыщение, активность, доп. метрики + таблица по дням). **BUG-04**: ClamAV depends_on condition: service_healthy. **BUG-05**: Node.js 20 → 22 в Dockerfile.api + Cairo/Pango зависимости. 8 новых тестов (UX-18 + UX-21), 313 всего |

---

## Ближайшие UX-доработки вне крупных фаз

### Редактирование уже внесённого приёма пищи

**Статус:** ✅ Реализовано в v1.6.0

### Что делаем

- Добавить в карточку приёма пищи кнопку **«Редактировать»** рядом с удалением.
- Открывать форму/диалог с уже заполненными полями записи: время, тип приёма, еда, напитки, вода, голод/сытость, контекст, КБЖУ.
- Сохранять изменения через существующий backend `PATCH /api/meals/:id`.
- После успешного сохранения обновлять TanStack Query cache для текущего дня.
- Покрыть flow тестами:
  - integration: `PATCH /api/meals/:id` принимает валидные поля и отклоняет mass assignment;
  - E2E: пользователь добавляет запись, редактирует текст еды, видит обновлённую карточку.

### Почему важно

Сейчас пользователь может только удалить ошибочную запись и создать новую. Для дневника питания это неудобно: чаще нужно поправить время, текст еды или оценки голода/сытости без потери контекста дня.

### Технические заметки

- Backend уже содержит `PATCH /api/meals/:id` и строгую Zod-схему после Phase 2; основная работа — UI/UX.
- Переиспользовать существующие поля формы добавления, но не смешивать состояния add/edit так, чтобы случайно сохранить новую запись вместо обновления.
- После редактирования сбрасывать состояние КБЖУ так же аккуратно, как при добавлении.

---

### UX-2 — Полнее показывать пользователя в админ-панели

**Статус:** ✅ Реализовано в v1.13.0

### Что делаем

- В таблицах админ-панели рядом с именем/e-mail/ролью явно показывать **логин (`username`)** как главный идентификатор пользователя.
- Проверить все admin-блоки: список пользователей, активные сессии, reset password, DeepSeek usage при наличии user breakdown.
- Добавить E2E или integration/UI-проверку, что admin видит логин пользователя и не путает его с display name.

### Почему важно

Display name может быть пустым, повторяться или меняться. Для администрирования и поддержки главным стабильным идентификатором должен быть логин.

---

### UX-3 — Перенос приёма пищи между днями

**Статус:** ✅ Реализовано в v1.13.0

### Что делаем

- Разрешить при редактировании приёма пищи менять дату записи, включая перенос на вчерашний или любой прошлый день.
- Сохранять перенос через backend так, чтобы запись меняла `dayId` на день новой даты.
- После переноса обновлять TanStack Query cache/invalidations сразу для двух дней: старого и нового.
- Пересчитывать дневные агрегаты и аналитику по фактическому дню записи.
- Покрыть тестами:
  - integration: PATCH meal с новой датой переносит запись между `days`;
  - E2E: add today → edit date to yesterday → card disappears today and appears yesterday;
  - analytics: перенесённая запись учитывается в новом дне.

### Почему важно

Пользователь может ошибочно внести отчёт за сегодня, хотя приём относился ко вчера. Сейчас дата в edit-mode заблокирована, из-за чего приходится удалять запись и создавать новую, а дневные итоги/аналитика могут остаться неточными.

### Технические заметки

- `PATCH /api/meals/:id` сейчас принимает поля приёма, но `date` исключён из `updateMealSchema`; нужно расширить схему безопасно, не открывая mass assignment.
- Если целевого дня ещё нет, использовать `getOrCreateDay(userId, date)`.
- При переносе не менять `createdAt`; это время создания записи, а не дата приёма.
- UI должен явно предупреждать: «Запись будет перенесена в другой день».

---

### UX-4 — Явные даты подъёма и отбоя

**Статус:** ✅ Реализовано в v1.13.0

### Что делаем

- В итогах дня хранить и отображать не только время, но и дату подъёма/отбоя.
- Правило по умолчанию:
  - если время отбоя `18:00–23:59`, дата отбоя = дата текущего дневника;
  - если время отбоя `00:00–17:00`, дата отбоя = следующий календарный день после даты текущего дневника;
  - дата подъёма = дата текущего дневника, если пользователь явно не изменил её.
- Обновить Excel-отчёт: показывать дату+время подъёма и дату+время отбоя.
- Обновить аналитику сна: считать длительность по явным датам, а не только по переходу через полночь.
- Покрыть тестами:
  - sleep `23:30 → 07:00` считается как 7.5 ч;
  - sleep `01:00 → 09:00` относится к отбою следующего дня по правилу;
  - Excel содержит явные даты.

### Почему важно

Сон часто пересекает полночь. Без явной даты отбоя невозможно надёжно отличить «лёг в 01:00 после этого дня» от «лёг в 01:00 в начале этого дня», а это влияет на отчёт врачу и аналитику сна.

### Технические заметки

- Потребуется миграция БД: например `wake_date`, `sleep_date` в `days`.
- Нужно сохранить обратную совместимость: для старых записей вычислять даты по правилу по умолчанию.
- UI итогов дня должен показывать date inputs компактно и не перегружать основной flow скачивания отчёта.

---

### UX-5 — Календарные границы периодов в аналитике

**Статус:** ✅ Реализовано в v1.13.0

### Что делаем

- В аналитике при выборе **«Неделя»** показывать период с понедельника по воскресенье текущей выбранной недели, даже если в понедельник или другие дни нет данных.
- Для **«Месяц»** показывать календарный месяц с 1-го числа до последнего дня месяца.
- Для **«Год»** показывать календарный год с `01.01` до `31.12` выбранного года.
- Пустые дни внутри периода не пропускать: отображать нули/пустые точки, чтобы визуально было видно пропуски заполнения.
- Добавить навигацию по календарным периодам: предыдущая/следующая неделя, месяц, год.
- Покрыть тестами:
  - week period всегда начинается с понедельника;
  - month period всегда начинается с 1-го числа;
  - year period всегда начинается с `YYYY-01-01`;
  - analytics API/UI возвращает и отображает пустые дни периода.

### Почему важно

Сейчас период «7/30/365 дней» удобен как rolling window, но для врача и самонаблюдения чаще нужны календарные недели, месяцы и годы. Календарные границы помогают сравнивать периоды между собой и видеть пропуски заполнения.

### Технические заметки

- Backend `/api/analytics/summary` сейчас отдаёт только дни, существующие в таблице `days`; нужно дополнить ответ пустыми днями календарного периода.
- Frontend `/#/analytics` должен перейти от rolling `days` к выбранному календарному period anchor date.
- Для недели использовать MSK-календарь: понедельник = первый день недели.

---

## Фаза 0 — Заготовки под Telegram-бот

### Что делаем

- Создать в кодовой базе stub-модули и TypeScript-интерфейсы под будущего TG-бота: `src/bot/index.stub.ts`, `src/bot/types.ts`.
- Задокументировать точки интеграции — бот использует те же HTTP-эндпоинты, что и веб-клиент:
  - `POST /api/meals` — добавление записи о приёме пищи
  - `GET /api/days` — список дней с записями
  - `GET /api/report` — выгрузка Excel-отчёта
- Добавить в `.env.example` закомментированные переменные для бота.

```dotenv
# Telegram Bot (Фаза 0 — заготовка, не активно)
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_WEBHOOK_URL=
# TELEGRAM_ALLOWED_CHAT_IDS=
```

### Почему важно

Заложить архитектурные точки расширения сейчас дешевле, чем рефакторить позже. TG-бот станет полноценным клиентом поверх существующего REST API без изменений бэкенда.

### Технические заметки

- Бот аутентифицируется через тот же `/api/auth/login` — получает JWT и передаёт его в заголовке `Authorization: Bearer`.
- Stub-файлы должны компилироваться без ошибок (можно использовать `// @ts-expect-error` или пустые экспорты).
- Переменные в `.env.example` закомментированы — они не влияют на текущий запуск.
- Рекомендуемая библиотека для будущей реализации: `grammy` (современный TS-first Telegram Bot framework).

---

## Фаза 1 — Качество кода

### Что делаем

- **Unit-тесты (Vitest):** покрытие бизнес-логики — расчёт КБЖУ, парсинг дат, утилиты шифрования.
- **Integration-тесты (supertest):** тестирование Express-маршрутов с тестовой SQLite in-memory БД.
- **E2E-тесты (Playwright):** критические user flows — регистрация, логин, добавление записи, скачивание отчёта.
- **Линтеры:**
  - ESLint + `@typescript-eslint` для TypeScript-кода
  - Prettier для единого форматирования
  - Husky + `lint-staged` для pre-commit хуков
- **CI/CD — GitHub Actions pipeline:**

```
lint → typecheck → unit-tests → integration-tests → build → deploy
```

### Почему важно

Без тестов любой рефакторинг (особенно в Фазах 3–8) несёт риск регрессий. CI/CD обеспечивает уверенность при деплое: сломанный код не попадёт на продакшен.

### Технические заметки

- Линтеры и статический анализ (`tsc --noEmit`, ESLint) эффективнее запускать в Cursor/IDE — там уже встроены TypeScript Language Server и ESLint-плагин с подсветкой в реальном времени.
- Для тестирования маршрутов создать `src/test/setup.ts` с инициализацией тестовой SQLite `:memory:` БД.
- Playwright-тесты запускать против локального `docker compose up` или отдельного `test` окружения.
- Таргет покрытия: >80% для бэкенда, >60% для фронтенда (критические компоненты).
- Пример GitHub Actions job для деплоя: SSH + `docker compose pull && docker compose up -d`.

---

## Фаза 2 — Безопасность и аудит

### Что делаем

- **npm audit:** запускать при каждом PR, автоматически через `npm audit --audit-level=high`.
- **OWASP Top 10 review:** ручная проверка по чеклисту: Injection, Broken Auth, XSS, IDOR, Security Misconfiguration.
- **Helmet.js:** добавить в Express middleware для HTTP security headers.
- **Rate-limiting:** `express-rate-limit` на критических эндпоинтах:
  - `/api/auth/login` — 10 попыток / 15 мин / IP
  - `/api/meals` (POST) — 60 запросов / мин / пользователь
- **CORS hardening:** явный whitelist origin вместо `*`.
- **Content Security Policy (CSP):** настроить через Helmet, заблокировать inline-скрипты.
- **Dependabot:** включить в настройках GitHub репозитория для автоматических PR с обновлениями зависимостей.

### Почему важно

Медицинские данные (дневник питания) — чувствительная информация. Утечка или компрометация подрывает доверие пользователей и потенциально нарушает требования к обработке персональных данных (152-ФЗ РФ).

### Технические заметки

- Для глубокого code review на предмет уязвимостей: Cursor с Claude (Sonnet/Code) эффективнее автоматических CI-сканеров — можно задать контекст и получить качественный анализ.
- CSP для SPA (React): разрешить `script-src 'self'`, запретить `unsafe-inline`; Vite генерирует хэши для inline-скриптов — добавить их в CSP или использовать `nonce`.
- Helmet конфигурация:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);
```

- Rate-limit хранить в памяти (по умолчанию) — при масштабировании заменить на Redis store.

---

## Фаза 3 — Персистентность данных

### Что делаем

- **Docker volume:** убедиться, что `docker-compose.yml` содержит именованный volume для `/data`:

```yaml
services:
  api:
    volumes:
      - sqlite_data:/data
volumes:
  sqlite_data:
    driver: local
```

- Проверить, что `docker compose down` (без флага `--volumes`) **не удаляет** volume.
- Добавить в `preflight-check.sh` проверку наличия volume перед деплоем.
- **Автоматический backup:** cron-задача (ежедневно в 03:00 MSK) — копирование SQLite на внешнее хранилище:
  - Вариант A: `rclone` → Google Drive / S3-совместимое хранилище (VK Cloud Object Storage)
  - Вариант B: скрипт `backup.sh` + `scp`/`rsync` на второй VPS
- Хранить последние 30 резервных копий, старые удалять автоматически.
- **Долгосрочно:** при росте нагрузки (>500 одновременных пользователей) — миграция на PostgreSQL.

### Почему важно

SQLite в Docker-контейнере — типичная ловушка: при `docker compose down -v` или пересборке образа данные теряются безвозвратно. Медицинский дневник питания не должен терять данные ни при каких обстоятельствах.

### Технические заметки

- SQLite поддерживает hot backup через `VACUUM INTO '/backup/diary_$(date +%Y%m%d).db'` — безопасно работает при активных соединениях.
- Для backup через rclone: `rclone copy /data/diary.db gdrive:food-diary-backups/`.
- При миграции на PostgreSQL: использовать `pgloader` для переноса данных из SQLite.
- PostgreSQL + `pgBouncer` (connection pooling) оптимальны при нагрузке >100 RPS.
- SQLite WAL mode (`PRAGMA journal_mode=WAL`) обязателен для продакшена — повышает конкурентность.

---

## Фаза 4 — Административная панель

**Статус:** ✅ MVP реализован в v1.10.0 — роли/admin guard, bootstrap, users, sessions, reset password, DeepSeek usage dashboard. Внешние уведомления и бюджетные алерты вынесены в Фазу 9.

### Что делаем

- Страница `/admin` — доступна только пользователям с ролью `admin`.
- **Middleware `requireAdmin`:** проверка JWT + роли перед всеми `/api/admin/*` маршрутами.
- **Список активных сессий:** таблица `admin_sessions` с полями: `userId`, `ip`, `userAgent`, `lastActivity`, `jti`.
- **Принудительный сброс всех сессий:**
  - Вариант A: `jti` blacklist в таблице `revoked_tokens` (предпочтительно — не требует рестарта).
  - Вариант B: смена `JWT_SECRET` в `.env` + перезапуск контейнера (радикально).
- **Сброс пароля для пользователя:** генерация временного пароля (8 символов, bcrypt), отображение в UI один раз.
- **Мониторинг DeepSeek API:**
  - Счётчики запросов за день/месяц
  - Оценка стоимости (токены × тариф)
  - Алерты при превышении дневного лимита (порог в `.env`)

### Почему важно

Без административного инструментария невозможно оперативно реагировать на инциденты безопасности (компрометация аккаунта, подозрительная активность). Мониторинг API-расходов предотвращает неожиданные счета от DeepSeek.

### Технические заметки

- Роль `admin` добавить в таблицу `users` как enum поле: `role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))`.
- JWT payload включать поле `role` — проверять в middleware без обращения к БД.
- UI для `/admin` можно реализовать как отдельную React-страницу с простой таблицей (без отдельного фреймворка).
- `jti` blacklist — хранить в памяти (Set) с TTL-очисткой или в отдельной таблице SQLite. При масштабировании заменить на Redis.

---

## Фаза 5 — Самостоятельный сброс пароля

**Статус:** ✅ Реализовано в v1.15.0

### Что делаем

- Форма «Забыл пароль» на странице логина.
- **Таблица `password_reset_tokens`:** `token` (UUID v4), `userId`, `expiresAt` (NOW + 1 час), `used` (bool).
- **Вариант реализации 1 — Email (SMTP/SendGrid):**
  - Письмо с одноразовой ссылкой `/reset-password?token=<uuid>`
  - Переменные: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Вариант реализации 2 — Контрольные вопросы:**
  - Проще в реализации, не требует SMTP
  - Менее безопасно — не рекомендуется для продакшена
- После использования токен помечается как `used = true`.

### Почему важно

Для MVP врачебного наблюдения достаточно admin-инициированного сброса (Фаза 4). Самостоятельный сброс нужен при расширении базы пользователей — снижает нагрузку на администратора.

### Технические заметки

- Рекомендуемый вариант для первой итерации: admin-сброс (Фаза 4) → email-сброс (Фаза 5).
- Для email: `nodemailer` + SendGrid/Mailgun — достаточно бесплатного тарифа для малого числа пользователей.
- Токены сброса чистить по cron (`DELETE FROM password_reset_tokens WHERE expiresAt < NOW() OR used = 1`).
- Не раскрывать в ответе API, существует ли пользователь с указанным email (защита от user enumeration).
- Добавить rate-limit на `/api/auth/forgot-password`: 3 запроса / 15 мин / IP.

---

## Фаза 6 — HTTPS и домен

### Что делаем

- **Домен:** `fooddiary.razbudimir.com` → DNS A-запись на `95.163.213.45` (или будущий VK Cloud IP).
- **Reverse proxy — Caddy** (рекомендуется, уже упоминается в `preflight-check.sh`):

```caddyfile
fooddiary.razbudimir.com {
    tls /etc/ssl/razbudimir/fullchain.pem /etc/ssl/razbudimir/privkey.pem
    reverse_proxy localhost:5000
    encode gzip
}
```

- Wildcard сертификат `*.razbudimir.com` — скопировать `cert.pem` + `key.pem` в volume, указать в Caddyfile явно (вместо ACME auto).
- **Редирект HTTP → HTTPS:** Caddy делает это автоматически при наличии TLS-блока.
- **Firewall (ufw):**

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5000/tcp   # порт Node.js не доступен снаружи
```

### Почему важно

HTTPS обязателен для передачи медицинских данных. Без TLS JWT-токены и данные питания передаются в открытом виде. Кроме того, браузеры блокируют httpOnly cookies на HTTP.

### Технические заметки

- Caddy предпочтительнее nginx для данного проекта: минимальный Caddyfile, автоматический HSTS, gzip из коробки.
- При использовании wildcard сертификата вручную: следить за сроком действия, обновлять до истечения. Настроить cron-напоминание за 30 дней.
- Если в будущем переезд на Cloudflare: Cloudflare Origin Certificate совместим с Caddy — загрузить в volume так же.
- Docker Compose: добавить Caddy как отдельный сервис или запускать Caddy на хосте (вне Docker) для простоты.
- Проверка: `curl -I https://fooddiary.razbudimir.com` должен вернуть `HTTP/2 200` с заголовком `strict-transport-security`.

---

## Фаза 7 — WAF и инфраструктура

### Что делаем

- **Cloudflare (бесплатный план):**
  - Проксирование через Cloudflare: DNS → Cloudflare → VPS
  - WAF (базовые правила), DDoS protection, CDN для статики
  - Правила: блокировка гео (если сервис только для РФ), rate-limit на `/api/auth/login`
- **При переезде в VK Cloud (РФ):**
  - Рассмотреть VK Cloud WAF (managed)
  - Альтернатива: Nginx + ModSecurity (open-source WAF) перед Caddy/Node.js
- **Cloudflare + wildcard сертификат:**
  - Вариант A: загрузить свой `*.razbudimir.com` cert в Cloudflare → SSL mode «Full (strict)»
  - Вариант B: использовать Cloudflare Origin Certificate на сервере

### Почему важно

WAF защищает от автоматизированных атак (SQL injection, credential stuffing, сканеры уязвимостей) без изменений в коде приложения. Cloudflare CDN ускоряет загрузку статики React-приложения.

### Технические заметки

- Cloudflare бесплатный план: 5 WAF-правил, достаточно для данного проекта.
- Geo-blocking в Cloudflare: Firewall Rules → `ip.geoip.country ne "RU"` → Block (если сервис только для РФ-аудитории).
- При использовании Cloudflare проксирования: реальный IP пользователя приходит в заголовке `CF-Connecting-IP` — обновить rate-limiter и логи для чтения этого заголовка.
- Nginx ModSecurity: OWASP Core Rule Set (CRS) — готовые правила, достаточно включить и настроить уровень чувствительности.
- Важно: не включать Cloudflare «Full (strict)» до настройки Origin Certificate — иначе 526 ошибка.

---

## Фаза 8 — Масштабируемость и микросервисы

### Что делаем

- **Текущий монолит:** достаточен для ~1 000 активных пользователей — не усложнять преждевременно.
- **DeepSeek worker:** при росте нагрузки вынести вызовы DeepSeek API в отдельный асинхронный worker:
  - Очередь задач: **BullMQ + Redis**
  - Основной сервис ставит задачу в очередь → worker обрабатывает → результат возвращается через webhook или polling
- **SQLite → PostgreSQL:** при нагрузке >500 одновременных пользователей или >10 000 записей/день:
  - Миграция через `pgloader`
  - Connection pooling: **pgBouncer** (transaction mode)
- **Оркестрация:**
  - Текущий этап: Docker Compose (single host) — достаточно
  - При необходимости горизонтального масштабирования: VK Cloud managed containers или Kubernetes

### Почему важно

Преждевременная микросервисная архитектура увеличивает операционную сложность без реальной пользы. Разделять имеет смысл только при идентифицированных узких местах через профилирование.

### Технические заметки

- Профилировать с помощью: `clinic.js` (Node.js) + `k6` (нагрузочное тестирование).
- BullMQ требует Redis — добавить как сервис в Docker Compose при необходимости.
- SQLite WAL mode (`PRAGMA journal_mode=WAL`) + `PRAGMA synchronous=NORMAL` значительно повышают производительность записи.
- Kubernetes целесообразен только при наличии DevOps-ресурса — для одиночного VPS это избыточно.
- Метрики для принятия решения о масштабировании: CPU >70% sustained, p95 latency >500ms, SQLite lock contention в логах.

---

## Фаза 9 — Алертинг DeepSeek в админке

### Что делаем

- **Таблица `api_usage`:**

```sql
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  endpoint TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate REAL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

- Парсить поле `usage` из каждого ответа DeepSeek API и записывать в таблицу.
- **Дашборд в `/admin`:**
  - График запросов по дням/месяцам
  - Топ пользователей по потреблению токенов
  - Суммарная оценка стоимости за период
- **Алерты:**
  - Порог дневного лимита токенов в `.env`: `DEEPSEEK_DAILY_TOKEN_LIMIT`
  - При превышении: уведомление через TG-бот (Фаза 0) или email (Фаза 5)

### Почему важно

DeepSeek API — платный ресурс. Без мониторинга один активный пользователь может сгенерировать непредвиденные расходы. Алерты позволяют реагировать до превышения бюджета.

### Технические заметки

- DeepSeek API response: `response.usage.prompt_tokens` + `response.usage.completion_tokens` — доступны уже сейчас.
- Оценка стоимости: DeepSeek-V3 тарификация — уточнять актуальные тарифы в документации DeepSeek.
- Для графиков в UI: `recharts` (легковесная библиотека, уже может быть в зависимостях React-проекта).
- Агрегация по дням: `SELECT DATE(timestamp) as day, SUM(tokens_in + tokens_out) as total_tokens FROM api_usage GROUP BY day`.
- Алерт реализовать как middleware-check при каждом вызове DeepSeek: если дневной лимит превышен — заблокировать вызов и уведомить.

---

## Фаза 10 — Управление временем жизни сессий

### Что делаем

- Задать явное время жизни JWT-токена и cookie через переменные окружения.
- Реализовать **sliding session** (продление сессии при активности) через refresh-токены.
- Добавить **idle timeout** — принудительный выход при бездействии на фронтенде.
- Настроить корректные атрибуты cookie: `Secure`, `HttpOnly`, `SameSite=Strict`, `Max-Age`.
- Отображать пользователю предупреждение за N минут до истечения сессии.

### Best Practices — какие значения выбрать

#### Рекомендации OWASP

| Тип приложения                             | Idle timeout | Absolute timeout |
| ------------------------------------------ | ------------ | ---------------- |
| Высокая чувствительность (банки, медицина) | 2–5 мин      | 30 мин           |
| Средняя (корпоративные системы)            | 15–30 мин    | 4–8 часов        |
| Низкая (публичные сайты)                   | 30–60 мин    | 24 часа+         |

Food Diary — медицинские данные → категория **«средняя»** (не банковские, но личные). Рекомендуется:

- **Access token (JWT):** 30 минут
- **Refresh token:** 7 дней (с возможностью отзыва)
- **Idle timeout на фронтенде:** 30–60 минут

#### Схема двух токенов (access + refresh)

```
[Логин] → access_token (30 мин, в памяти JS) + refresh_token (7 дней, httpOnly cookie)
                │
                ├── access_token истёк → POST /api/auth/refresh → новый access_token
                │
                └── refresh_token истёк → редирект на /login
```

**Почему не один долгоживущий JWT:**

- Долгий JWT нельзя отозвать без blacklist — компрометация = неделю атакующий имеет доступ
- Refresh token хранится в httpOnly cookie → недоступен JS → защита от XSS
- Access token короткий → украденный токен быстро устаревает

#### Сравнение вариантов хранения

| Хранение                                    | XSS-защита    | CSRF-защита           | Logout              | Рекомендация      |
| ------------------------------------------- | ------------- | --------------------- | ------------------- | ----------------- |
| httpOnly cookie (access)                    | ✅            | ❌ (нужен CSRF-токен) | ✅ через Set-Cookie | Текущий подход    |
| httpOnly cookie (refresh) + memory (access) | ✅            | ✅ (access в памяти)  | ✅                  | **Рекомендуется** |
| localStorage                                | ❌ XSS уязвим | ✅                    | Сложнее             | Не рекомендуется  |

### Рекомендованные значения для Food Diary

```dotenv
# Время жизни access token (JWT)
JWT_EXPIRES_IN=30m

# Время жизни refresh token
JWT_REFRESH_EXPIRES_IN=7d

# Cookie Max-Age для refresh token (секунды)
# 7 дней = 604800
REFRESH_COOKIE_MAX_AGE=604800

# Idle timeout — предупреждение на фронтенде (минуты)
SESSION_IDLE_WARNING_MIN=25

# Idle timeout — принудительный выход (минуты)
SESSION_IDLE_TIMEOUT_MIN=30
```

### Почему важно

Медицинский дневник питания содержит чувствительные персональные данные. Бессрочная сессия — угроза при физическом доступе к устройству (чужой компьютер, телефон). OWASP относит неправильное управление сессиями к топ-10 уязвимостей веб-приложений (A07:2021 — Identification and Authentication Failures).

### Технические заметки

- **Текущее состояние:** JWT хранится в httpOnly cookie, время жизни задаётся через `JWT_EXPIRES_IN` в `.env` — базовая защита есть.
- **`SameSite=Strict`** на cookie refresh token — блокирует CSRF-атаки без дополнительных CSRF-токенов.
- **Absolute timeout** (независимо от активности): раз в 7 дней принудительный повторный логин — стандарт для enterprise-систем.
- При реализации `jti` blacklist (Фаза 4) — logout немедленно инвалидирует сессию без ожидания истечения токена.

---

### Чеклист реализации (порядок шагов)

#### Шаг 1 — Схема БД: таблица refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  token     TEXT NOT NULL UNIQUE,   -- UUID v4, хранить хэш (SHA-256)
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiresAt DATETIME NOT NULL,      -- NOW + 7 дней
  revoked   INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userAgent TEXT,
  ip        TEXT
);
CREATE INDEX idx_refresh_tokens_token  ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_userId ON refresh_tokens(userId);
```

> Хранить не сам токен, а его SHA-256 хэш — чтобы утечка таблицы не дала атакующему refresh-токены.

#### Шаг 2 — server/auth.ts: generateRefreshToken + verifyRefreshToken

```typescript
import crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return crypto.randomUUID(); // UUID v4, криптостойкий
}
```

#### Шаг 3 — server/routes.ts: три новых эндпоинта

```typescript
// POST /api/auth/login — изменить: выдавать короткий access + refresh cookie
// Было: JWT_EXPIRES_IN из .env (обычно '7d' или '24h')
// Стало: access JWT = 30m, refresh token в httpOnly cookie = 7 дней

// POST /api/auth/refresh — обновить access token по refresh cookie
app.post("/api/auth/refresh", async (req, res) => {
  const rawToken = req.cookies["refresh_token"];
  if (!rawToken) return res.status(401).json({ error: "No refresh token" });

  const hash = hashToken(rawToken);
  const record = db
    .prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expiresAt > datetime("now")')
    .get(hash);
  if (!record) return res.status(401).json({ error: "Invalid or expired refresh token" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(record.userId);
  const accessToken = signToken({ userId: user.id, role: user.role }, "30m");
  res.json({ accessToken });
});

// POST /api/auth/logout — отозвать refresh token
app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const rawToken = req.cookies["refresh_token"];
  if (rawToken) {
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE token = ?").run(hashToken(rawToken));
  }
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.json({ ok: true });
});
```

#### Шаг 4 — Cookie атрибуты при выдаче refresh token

```typescript
// В /api/auth/login после успешной аутентификации:
const rawRefresh = generateRefreshToken();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

db.prepare("INSERT INTO refresh_tokens (token, userId, expiresAt, userAgent, ip) VALUES (?, ?, ?, ?, ?)").run(
  hashToken(rawRefresh),
  user.id,
  expiresAt.toISOString(),
  req.headers["user-agent"],
  req.ip,
);

res.cookie("refresh_token", rawRefresh, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // только HTTPS в проде
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней в мс
  path: "/api/auth", // cookie уходит только на /api/auth/* — минимальный scope
});

// Access token возвращать в JSON (не в cookie) — хранится в памяти React
const accessToken = signToken({ userId: user.id, role: user.role }, "30m");
res.json({ accessToken, user: { id: user.id, username: user.username } });
```

#### Шаг 5 — client/src/lib/auth.tsx: хранение access token в памяти

```typescript
// Хранить accessToken в React state/context, НЕ в localStorage
const [accessToken, setAccessToken] = useState<string | null>(null);

// При старте приложения — попытаться обновить через refresh cookie
useEffect(() => {
  fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => data && setAccessToken(data.accessToken))
    .catch(() => {});
}, []);

// Все API-запросы — передавать accessToken в заголовке Authorization
// Перехватчик: если 401 → попробовать /api/auth/refresh → повторить запрос
```

#### Шаг 6 — Idle timeout на фронтенде (хук useIdleTimer)

```typescript
// client/src/hooks/useIdleTimer.ts
import { useEffect, useRef, useCallback } from "react";

const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

export function useIdleTimer(
  onWarning: () => void, // показать модальное окно
  onLogout: () => void, // принудительный выход
  warningMin = 25,
  logoutMin = 30,
) {
  const warnTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    warnTimer.current = setTimeout(onWarning, warningMin * 60 * 1000);
    logoutTimer.current = setTimeout(onLogout, logoutMin * 60 * 1000);
  }, [onWarning, onLogout, warningMin, logoutMin]);

  useEffect(() => {
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // запустить таймер сразу
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(warnTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [reset]);
}
```

> Использовать в DiaryPage: при `onWarning` — показать toast/модалку «Сессия истекает через 5 минут», при `onLogout` — вызвать `logout()`.

#### Шаг 7 — Очистка устаревших refresh токенов (cron в БД)

```typescript
// В server/index.ts — запускать раз в час
setInterval(
  () => {
    db.prepare("DELETE FROM refresh_tokens WHERE expiresAt < datetime('now') OR revoked = 1").run();
  },
  60 * 60 * 1000,
);
```

#### Шаг 8 — .env.example (добавить новые переменные)

```dotenv
# Время жизни access token (JWT) — короткий
JWT_EXPIRES_IN=30m

# Время жизни refresh token
JWT_REFRESH_EXPIRES_IN=7d

# Cookie Max-Age для refresh token (секунды), 7 дней = 604800
REFRESH_COOKIE_MAX_AGE=604800

# Idle timeout фронтенд — предупреждение (минуты)
SESSION_IDLE_WARNING_MIN=25

# Idle timeout фронтенд — принудительный выход (минуты)
SESSION_IDLE_TIMEOUT_MIN=30
```

---

## Фаза 11 — Аналитика и графики истории питания

### Что делаем

Отдельный раздел (кнопка в меню «Аналитика») с интерактивными графиками и историческими метриками. Периоды: **день / неделя / месяц / 3 месяца / 6 месяцев / 12 месяцев**.

---

### Блок 1 — Сон

**Метрики:**

- Время отбоя и подъёма по дням (ось X — даты, ось Y — время на шкале 0–24ч)
- Продолжительность сна (часы) — бар-чарт по дням
- Динамика: среднее время сна за период
- «Долг сна» — накопленный дефицит относительно цели (например, 8 ч)

**Нюанс реализации:** если лёг в 23:30, встал в 07:00 — продолжительность считается через midnight crossing:

```typescript
function sleepDuration(sleepTime: string, wakeTime: string): number {
  // sleepTime: "23:30", wakeTime: "07:00"
  const [sh, sm] = sleepTime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // перенос через полночь
  return mins / 60;
}
```

**Полезные сравнения:**

- Корреляция «мало спал → средний голод выше» (ранний завтрак, более частые перекусы)
- Дни с недосыпом (<6 ч) vs среднее потребление калорий в тот же день

---

### Блок 2 — Калорийность и КБЖУ

**Метрики:**

- Калорийность по дням — линейный или бар-чарт
- Скользящее среднее за 7 дней (сглаживает выбросы)
- Динамика Б/Ж/У по неделям — stacked area chart
- Распределение калорий по типу приёма (завтрак / обед / перекус / ужин) — pie или stacked bar
- Дни без данных КБЖУ (не заполнено через DeepSeek) — видно где пропуски

**Полезные сравнения:**

- Будни vs выходные: средняя калорийность
- Дни с физической активностью vs без: калорийность
- Топ-5 самых калорийных дней за период с раскладкой по приёмам

---

### Блок 3 — Перерывы между приёмами пищи

**Метрики:**

- Среднее время между приёмами по дням — dot chart
- Длинные перерывы (>5 ч) — подсветка красным
- Время первого приёма (завтрак) — scatter plot по дням
- Время последнего приёма (ужин) — аналогично
- «Окно питания» = от первого до последнего приёма (Intermittent Fasting-метрика)

**Полезные сравнения:**

- Длинный перерыв перед едой → голод высокий → переедание (корреляция hungerBefore с gap)
- Позднее время ужина (после 21:00) vs качество сна

---

### Блок 4 — Шкала голода и насыщения

**Метрики:**

- Средний голод ДО приёма по дням — line chart
- Среднее насыщение ПОСЛЕ приёма по дням
- «Зелёная зона» (голод 3–5, насыщение 6–7) — процент попаданий за период
- Гистограмма распределения оценок голода и насыщения за период
- Переедания (насыщение ≥ 8) — количество за период

**Полезные сравнения:**

- Приёмы с голодом 0–2 («экстремальный голод») — когда чаще всего случаются (день недели, время суток)
- Корреляция высокого голода до приёма → высокое насыщение после (ожидаемо, но интересно видеть на графике)

---

### Блок 5 — Активность и шаги

**Метрики:**

- Шаги по дням — бар-чарт с целевой линией (например, 10 000)
- Дни с указанной физической активностью — calendar heatmap (GitHub-style)
- Недели с активностью ≥ 3 дней vs средняя калорийность в ту же неделю

---

### Блок 6 — Дополнительные аналитические метрики (best practices)

Эти метрики специфичны для медицинского дневника питания и дают врачу ценный контекст:

| Метрика                                    | Что показывает                                        | Практическая ценность                        |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------------------------- |
| **Регулярность заполнения**                | % дней с хотя бы 1 записью за период                  | Мотивация + честность данных                 |
| **Контекст приёмов**                       | Топ-5 контекстов (за компьютером, в спешке, с семьёй) | Паттерны эмоционального питания              |
| **Вода за день**                           | Среднее потребление воды (л) по дням, trend           | Гидратация                                   |
| **Разнообразие типов приёма**              | Какой тип пропускается чаще всего (завтрак?)          | Режим питания                                |
| **Стрик**                                  | Количество дней подряд с заполнением                  | Геймификация, мотивация                      |
| **Вечернее питание**                       | % калорий после 19:00 от суточного КБЖУ               | Связь с весом, качеством сна                 |
| **Распределение приёмов по времени суток** | Heatmap: час дня × день недели                        | Поведенческие паттерны                       |
| **Корреляция сон–КБЖУ**                    | Недосып → рост калорийности на следующий день         | Доказано в науке, интересно видеть своё      |
| **Вариабельность калорийности**            | Стандартное отклонение за период                      | Чем стабильнее — тем лучше для контроля веса |

---

### Технические заметки

#### Стек для графиков

| Вариант                        | Плюсы                                          | Минусы                                  |
| ------------------------------ | ---------------------------------------------- | --------------------------------------- |
| **Recharts**                   | React-native, легковесный, хорошо с TypeScript | Меньше типов графиков                   |
| **Chart.js + react-chartjs-2** | Зрелый, много примеров                         | Больше boilerplate                      |
| **Tremor**                     | Компоненты в стиле shadcn, готовые дашборды    | Платные компоненты для сложных графиков |
| **Victory**                    | Мощный, анимации                               | Тяжёлый                                 |

**Рекомендация:** `Recharts` — уже в экосистеме React/Vite, минимальный размер бандла, хорошо с Tailwind.

#### API-эндпоинты

```typescript
// GET /api/analytics/summary?from=2026-05-01&to=2026-06-26
// Возвращает агрегированные данные за период:
{
  days: [{
    date: "2026-06-25",
    mealsCount: 3,
    totalCalories: 1640,
    protein: 86.1, fat: 81.8, carbs: 142.0,
    waterLitres: 0.5,
    avgHunger: 3.7,
    avgSatiety: 7.0,
    sleepDuration: 6.5,       // часов (из wakeTime - sleepTime)
    wakeTime: "07:30",
    sleepTime: "01:00",
    steps: 4278,
    sportActivity: "нет",
    firstMealTime: "12:10",   // время первого приёма
    lastMealTime: "17:00",    // время последнего приёма
    eatingWindowHours: 4.8,   // окно питания в часах
    maxGap: 4.8,              // максимальный перерыв между приёмами (часы)
    lateCaloriesRatio: 0.18,  // доля калорий после 19:00
    overeatingCount: 0,       // приёмов с насыщением ≥ 8
  }],
  summary: {
    avgCalories: 1450,
    avgSleep: 6.8,
    filledDaysRatio: 0.85,    // % заполненных дней
    currentStreak: 3,         // дней подряд с заполнением
  }
}
```

#### Периоды и кэширование

```typescript
// Периоды на фронтенде
const PERIODS = [
  { label: "Неделя", days: 7 },
  { label: "Месяц", days: 30 },
  { label: "3 месяца", days: 90 },
  { label: "6 месяцев", days: 180 },
  { label: "Год", days: 365 },
];

// На бэкенде — агрегировать через SQL, не в JS:
// SELECT date, SUM(calories), AVG(hungerBefore), ...
// FROM meals JOIN days ON meals.dayId = days.id
// WHERE days.date BETWEEN ? AND ?
// GROUP BY date ORDER BY date
```

> Агрегация на стороне SQLite — дешевле, чем тащить все записи в Node.js и считать в памяти. Для периода 12 месяцев это критично.

#### UX-рекомендации

- Переключатель периода — sticky tabs сверху, меняет все блоки одновременно
- Пустые дни — показывать серыми точками/барами (не пропускать!) чтобы видеть пропуски
- Тултипы на каждой точке — дата + точные значения
- Mobile-friendly: на телефоне — вертикальный скролл блоков, не горизонтальный
- Экспорт: кнопка «Скачать CSV» для каждого блока (для врача)

---

## Фаза 14 — Мобильная оптимизация веб-приложения

> **Приоритет: Высокий** — реализовать ДО Android APK/RuStore: PWA на смартфоне уже доступна сейчас

### Проблема

Текущий интерфейс не оптимизирован под смартфоны: шапка переполняется кнопками, форма добавления приёма неудобна на тач-экране, ползунки голода/насыщения сложно нажать пальцем, аналитика не адаптирована под узкий экран.

### Цель

Полноценный mobile-first UX без нативного приложения — использовать браузер/PWA как полноценную альтернативу APK.

---

### 14.1 — Шапка (Header)

**Проблема:** на экране 375px шапка имеет 3 группы элементов (лого + навигация по дням + кнопки), они не помещаются.

**Решение:**

- Перенести «Аналитика» и «Админ» в выпадающее меню (DropdownMenu из shadcn) или убрать текст, оставив только иконки
- Кнопку «Отчёт» — иконка `Download` без текста на мобильных (`<span className="hidden sm:inline">Отчёт</span>`)
- Навигацию дат: сделать компактнее, дату кликабельной открывающей date picker вместо inline
- Имя пользователя — уже скрыто на `hidden sm:block` ✅

```tsx
// Пример: кнопка Отчёт без подписи на мобильных
<Button size="sm" variant="outline" onClick={() => downloadReport(activeDate)}>
  <Download className="h-4 w-4" />
  <span className="hidden sm:inline ml-1">Отчёт</span>
</Button>
```

### 14.2 — Форма добавления приёма

**Проблема:** поля мелкие, двухколоночная сетка на 375px слишком узкая, `input[type=time]` нативно неудобен на iOS.

**Решение:**

- Поля времени и тип приёма — на мобильных в одну колонку (`grid-cols-1 sm:grid-cols-2`)
- Высота `input` и `textarea` — минимум `h-11` (44px) для tap targets (WCAG 2.5.5)
- Ползунки голода/насыщения — увеличить thumb до 24px через CSS:
  ```css
  [data-testid="slider-hunger"] [role="slider"],
  [data-testid="slider-satiety"] [role="slider"] {
    width: 24px;
    height: 24px;
  }
  ```
- Кнопки сохранить/отмена — `w-full` на мобильных, не `flex-1`
- (Опционально) форма открывается как `Sheet` (bottom drawer) вместо Card на мобильных

### 14.3 — Bottom navigation bar

**Проблема:** навигация между Дневником / Аналитикой / Настройками находится в шапке — неудобно тянуться вверх одной рукой.

**Решение:** добавить нижнюю панель навигации только на мобильных:

```tsx
// Показывается только на sm: и ниже
<nav
  className="fixed bottom-0 left-0 right-0 z-20 flex sm:hidden
                border-t bg-card/95 backdrop-blur pb-safe"
>
  <NavItem icon={<Utensils />} label="Дневник" href="/" />
  <NavItem icon={<BarChart3 />} label="Аналитика" href="/analytics" />
  {isAdmin && <NavItem icon={<Shield />} label="Админ" href="/admin" />}
</nav>
// + padding-bottom на main, чтобы контент не перекрывался
```

### 14.4 — Список приёмов (Meal cards)

**Проблема:** кнопки редактирования/удаления мелкие, текст обрезается.

**Решение:**

- Кнопки Pencil/Trash — минимум `h-9 w-9` (36px)
- Swipe-to-delete как альтернатива (опционально, фаза v2)
- Текст описания — `line-clamp-2` с раскрытием по тапу

### 14.5 — Аналитика на мобильных

**Проблема:** графики Recharts не ресайзятся корректно под узкий экран.

**Решение:**

- Все `<LineChart>` / `<BarChart>` — обернуть в `<ResponsiveContainer width="100%">` (проверить все 6 блоков)
- Легенды графиков — скрывать на мобильных или переносить под график
- Карточки KPI — `grid-cols-2` на мобильных вместо `grid-cols-4`
- Скролл таблиц горизонтальный: `overflow-x-auto`

### 14.6 — PWA «Добавить на экран»

**Проблема:** пользователь не знает, что можно добавить на главный экран.

**Решение:**

- Отловить событие `beforeinstallprompt`, показать баннер «Установить приложение» (один раз, `localStorage` flag)
- Для iOS Safari — инструкция в onboarding tour: «Нажмите Поделиться → На экран "Домой"»
- `manifest.json` уже настроен ✅

### Чеклист реализации

| #    | Задача                                               | Сложность | Приоритет      |
| ---- | ---------------------------------------------------- | --------- | -------------- |
| 14.1 | Компактный header — кнопки иконки, меню              | Низкая    | ✅ Реализовано |
| 14.2 | Форма — one-column на мобильных, крупные tap targets | Низкая    | ✅ Реализовано |
| 14.3 | Bottom navigation bar (hidden на desktop)            | Средняя   | ✅ Реализовано |
| 14.4 | Крупнее кнопки на карточках приёмов                  | Низкая    | ✅ Реализовано |
| 14.5 | ResponsiveContainer на всех графиках                 | Низкая    | ✅ Реализовано |
| 14.6 | PWA install prompt + iOS Safari подсказка            | Средняя   | ✅ Реализовано |

---

## Фаза 12 — Android APK (Android 10+)

### Что делаем

Нативная или гибридная **мобильная сборка** дневника питания для современных Android-устройств (**minSdk 29 / Android 10+**), с полным паритетом ключевых функций веб-версии: авторизация, ввод приёмов, КБЖУ, аналитика, офлайн-толерантность где возможно.

### Требования совместимости

| Параметр             | Значение                                                         |
| -------------------- | ---------------------------------------------------------------- |
| **minSdkVersion**    | 29 (Android 10)                                                  |
| **targetSdkVersion** | актуальный stable (35+)                                          |
| **compileSdk**       | совпадает с target                                               |
| **ABI**              | `arm64-v8a`, `armeabi-v7a` (x86_64 — опционально для эмуляторов) |
| **Ориентация**       | portrait + adaptive для планшетов                                |
| **Разрешения**       | только необходимые (INTERNET, при необходимости — уведомления)   |

### Стек (рекомендация)

| Вариант                                 | Плюсы                             | Минусы                                     |
| --------------------------------------- | --------------------------------- | ------------------------------------------ |
| **Capacitor + существующий React/Vite** | Переиспользование UI, быстрый MVP | WebView-ограничения                        |
| **React Native / Expo**                 | Нативнее UX                       | Больше переработки                         |
| **TWA (Trusted Web Activity)**          | Минимум кода, PWA в Chrome        | Зависимость от Chrome, ограниченный офлайн |

**Рекомендация для MVP:** Capacitor — обёртка над текущим клиентом с `https://fooddiary.razbudimir.com` или bundled static + API.

### Проверки качества и совместимости

- [ ] **Lint:** Android Lint + ESLint/TypeScript без ошибок
- [ ] **Сборка:** `./gradlew assembleRelease` — release APK/AAB без warnings критического уровня
- [ ] **ProGuard/R8:** obfuscation rules для WebView/Capacitor при необходимости
- [ ] **Тесты на устройствах:** Android 10, 12, 14, 15 (физические или Firebase Test Lab)
- [ ] **Экраны:** phone (360×640 … 412×915), tablet 10"
- [ ] **Сеть:** работа через HTTPS, корректные cookies/JWT в WebView или native auth
- [ ] **Back button:** предсказуемая навигация (не выход из приложения случайно)
- [ ] **Keyboard:** формы ввода приёмов не перекрываются клавиатурой
- [ ] **Accessibility:** TalkBack — labels на кнопках, контраст
- [ ] **Размер APK:** целевой < 25 МБ (или split APK по ABI)
- [ ] **Crash-free:** Firebase Crashlytics или Sentry mobile
- [ ] **Версионирование:** `versionCode` / `versionName` синхронно с web semver

### Артефакты

```
android/
├── app/build/outputs/apk/release/app-release.apk
└── app/build/outputs/bundle/release/app-release.aab   # для RuStore / Play
```

### Документация

- `docs/ANDROID.md` — сборка, подпись keystore, debug/release, checklist перед релизом
- CI job: сборка APK на tag `v*`

---

## Фаза 13 — Публикация в RuStore

### Что делаем

Подготовить и опубликовать **Food Diary** в [RuStore](https://www.rustore.ru/) — российский магазин приложений. Документировать пошаговую инструкцию для повторяемых релизов.

### Предварительные требования

1. **Юридическое лицо или ИП** — аккаунт разработчика RuStore (регистрация на [console.rustore.ru](https://console.rustore.ru/))
2. **Подписанный APK/AAB** — release-сборка из Фазы 12
3. **Keystore** — хранить вне git; backup в безопасном месте
4. **Политика конфиденциальности** — URL на сайте (обработка персональных данных, email, дневник питания)
5. **Иконка и скриншоты** — минимум 2 скрина телефона, feature graphic
6. **Описание** — на русском, категория «Здоровье» / «Образ жизни»

### Пошаговая инструкция (RuStore)

#### 1. Регистрация разработчика

1. Перейти на [console.rustore.ru](https://console.rustore.ru/)
2. Войти через Госуслуги или корпоративный аккаунт
3. Заполнить профиль разработчика (ИНН, контакты, банковские реквизиты для монетизации — если нужна)
4. Пройти модерацию аккаунта (1–3 рабочих дня)

#### 2. Создание приложения

1. **Мои приложения** → **Добавить приложение**
2. Указать название: «Food Diary» / «Дневник питания»
3. Package name: совпадает с `applicationId` в Android (`com.razbudimir.fooddiary` — зафиксировать в проекте)
4. Загрузить иконку 512×512 PNG

#### 3. Загрузка сборки

1. **Версии** → **Загрузить APK/AAB**
2. Выбрать `app-release.aab` (предпочтительно) или signed APK
3. Указать `versionName` и `versionCode` (monotonic increment)
4. Заполнить **Release notes** на русском

#### 4. Контент и модерация

1. **Описание** — краткое (80 символов) и полное
2. **Скриншоты** — 1080×1920 или требуемые RuStore размеры
3. **Возрастной рейтинг** — 0+ / 6+ (медицинский дневник без рецептов)
4. **Политика конфиденциальности** — `https://fooddiary.razbudimir.com/privacy` (создать страницу)
5. Отправить на **модерацию**

#### 5. После публикации

- Отслеживать отзывы и краши в RuStore Console
- Обновления: новый AAB → модерация → rollout
- Синхронизировать версию APK с web changelog

### Чеклист перед отправкой в RuStore

| #   | Проверка                                                                   | Статус |
| --- | -------------------------------------------------------------------------- | ------ |
| 1   | Release APK/AAB подписан production keystore                               | ☐      |
| 2   | `targetSdk` соответствует требованиям RuStore                              | ☐      |
| 3   | Нет hardcoded secrets в APK                                                | ☐      |
| 4   | API только HTTPS (`fooddiary.razbudimir.com`)                              | ☐      |
| 5   | Политика конфиденциальности доступна по URL                                | ☐      |
| 6   | Тестовый аккаунт для модераторов (login/password в приватном поле консоли) | ☐      |
| 7   | Скриншоты актуального UI                                                   | ☐      |
| 8   | `versionCode` больше предыдущей публикации                                 | ☐      |

### Документация

- `docs/RUSTORE.md` — полная инструкция с скриншотами консоли, шаблон описания, FAQ модерации
- Ссылка на RuStore в README после публикации

---

---

## Фаза 15 — Кабинет врача (Doctor Cabinet)

> **Статус:** ✅ Реализовано (v2.9.0)
> **Приоритет:** Высокий
> **Сложность:** Высокая
> **152-ФЗ:** Да — хранятся специальные категории ПД (здоровье), сервер VK Москва

### 15.1 Роль `doctor` и управление врачами

- Новая роль `doctor` (между `user` и `admin`): `user | doctor | admin`
- Администратор назначает роль `doctor` любому пользователю через Admin Panel
- У врача обязательный профиль: **ФИО, телефон, ссылка на Telegram**
- Врач видит своих пациентов, пациент видит своего врача и его контакты
- Врач назначает себе пациентов (из списка зарегистрированных пользователей без врача)
- Пациент может видеть только одного врача

**Новые таблицы БД:**

```
doctors         — doctor_id, user_id (FK), full_name, phone, telegram_url
doctor_patients — doctor_id (FK), patient_id (FK), assigned_at
```

**Новые маршруты:**

```
GET  /api/doctor/patients              — список пациентов врача
GET  /api/doctor/patients/:id/diary    — дневник питания пациента (read-only)
POST /api/admin/users/:id/set-role     — назначить роль (admin only)
PUT  /api/doctor/profile               — обновить профиль врача
GET  /api/user/my-doctor               — получить своего врача + контакты
```

### 15.2 Просмотр дневника пациента врачом

- Врач видит полный дневник питания своего пациента (только чтение)
- Отдельная страница `/doctor/patients/:id` с дневником и аналитикой
- Фильтрация по дате, вид как у самого пользователя

### 15.3 Уведомления врача пациентам (Web Push)

- Врач нажимает «Напомнить заполнить дневник» для конкретного пациента или всех
- Уведомление через **Web Push API** (PWA Service Worker уже есть)
- Шаблоны уведомлений: незаполненный дневник, напоминание о цели, произвольное
- Таблица `push_subscriptions`: `user_id, endpoint, p256dh, auth`
- VAPID ключи в `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

```
POST /api/doctor/patients/:id/notify   — отправить пуш пациенту
POST /api/push/subscribe               — подписать устройство пациента
```

### 15.4 Корректировки КБЖУ врачом

- Врач может вносить **комментарий-корректировку** к записи питания пациента
- Не редактирует запись напрямую — добавляет аннотацию: `doctor_note`, `suggested_kcal`
- Пациент видит пометку «Комментарий врача» рядом с записью
- Таблица `doctor_meal_notes`: `id, doctor_id, meal_id, note, suggested_kcal, created_at`

---

## Фаза 16 — 152-ФЗ Compliance

> **Статус:** ✅ Реализовано (v2.8.0)
> **Приоритет:** Высокий (обязательно перед Фазой 15)
> **Сложность:** Средняя

### 16.1 Согласие на обработку персональных данных

- Checkbox при регистрации: «Я даю согласие на обработку персональных данных»
- Ссылка на Политику конфиденциальности (`/privacy`)
- Дата согласия сохраняется в БД: `users.pd_consent_at`
- Отдельное согласие на обработку **специальных категорий ПД** (здоровье — рост, вес, диагнозы) при заполнении анкеты

### 16.2 Политика конфиденциальности

- Страница `/privacy` — статическая, описывает:
  - Какие ПД собираются (имя, email, рост, вес, пол, данные о питании)
  - Цели обработки
  - Хранение: серверы VK Cloud, Москва, РФ
  - Срок хранения
  - Права субъекта ПД (запрос, удаление, исправление)
  - Контакт оператора

### 16.3 Права субъекта ПД

- Кнопка «Удалить мой аккаунт и все данные» в настройках профиля
- Полное каскадное удаление: meals, sessions, doctor_notes, profile, user
- Запрос на выгрузку своих данных (JSON-архив)

```
DELETE /api/user/me        — удалить аккаунт (каскадное)
GET    /api/user/export    — экспорт всех своих данных в JSON
```

---

## Фаза 17 — Анкета пользователя (User Profile)

> **Статус:** ✅ Реализовано (v2.8.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **152-ФЗ:** Специальные категории ПД — реализовывать только после Фазы 16

### 17.1 Анкета при первом запуске

- Показывается один раз: после первой регистрации / первого входа
- Можно **пропустить** — кнопка «Пропустить, заполню позже»
- Поля анкеты:

  | Поле                       | Тип                                 | Обязательность |
  | -------------------------- | ----------------------------------- | -------------- |
  | Пол                        | radio: мужской/женский/не указан    | Нет            |
  | Рост (см)                  | number 100–250                      | Нет            |
  | Вес (кг)                   | number 30–300                       | Нет            |
  | Уровень активности         | select: минимальный/средний/высокий | Нет            |
  | Суточный КБЖУ (если знает) | 4 number fields                     | Нет            |

### 17.2 Хранение и применение

- Новая таблица `user_profiles`: `user_id, gender, height_cm, weight_kg, activity_level, target_kcal, target_protein, target_fat, target_carbs, updated_at`
- На основе роста/веса/активности — **автоматический расчёт рекомендуемого КБЖУ** (формула Миффлина-Сан Жеора)
- Профиль редактируется в настройках в любой момент
- Данные профиля передаются в контекст DeepSeek при анализе питания

### 17.3 Влияние на аналитику

- Графики аналитики показывают **личную норму** (из профиля) vs фактическое потребление
- Индикатор «выполнение нормы за день» на главной странице
- Если профиль не заполнен — показывается среднее референсное значение

---

## Фаза 18 — Таргет КБЖУ от врача

> **Статус:** ✅ Реализовано (v2.9.0)
> **Приоритет:** Средний
> **Сложность:** Средняя
> **Зависимость:** Фаза 15 (роль врача) + Фаза 17 (профиль пользователя)

### 18.1 Назначение плана питания

- Врач назначает пациенту **план КБЖУ с датами**: `start_date`, `end_date` (или бессрочно)
- Параметры плана: целевые калории, белки, жиры, углеводы, вода (мл/день), клетчатка
- Несколько планов не пересекаются по времени — валидация на уровне API
- Новая таблица `doctor_plans`: `id, doctor_id, patient_id, start_date, end_date, kcal, protein, fat, carbs, water_ml, notes`

```
POST   /api/doctor/patients/:id/plans    — создать план
GET    /api/doctor/patients/:id/plans    — список планов
DELETE /api/doctor/plans/:id             — удалить план
GET    /api/user/active-plan             — текущий активный план (для пользователя)
```

### 18.2 Отображение для пользователя

- На главной странице — карточка «Цель на сегодня» с прогресс-барами по каждому нутриенту
- Если активный план есть — берётся из него, иначе из личного профиля (Фаза 17)
- Цветовая индикация: зелёный (в норме), жёлтый (±20%), красный (далеко от цели)
- В аналитике — отдельный раздел «Выполнение плана врача» за период

---

## Фаза 19 — AI-советник по питанию

> **Статус:** 📋 Запланировано
> **Приоритет:** Средний
> **Сложность:** Средняя
> **Зависимость:** Фаза 17 (профиль) + Фаза 18 (план врача)

### 19.1 Кнопка «Совет нейросети»

- Кнопка «Как добрать КБЖУ?» на главной странице дневника (рядом со сводкой дня)
- Активна только если текущий день не достиг цели
- Нажатие → запрос к DeepSeek с контекстом:
  - Что уже съедено сегодня (список с КБЖУ)
  - Цель на день (из плана врача или профиля)
  - Чего не хватает (дефицит по нутриентам)
  - Профиль пользователя: непереносимости, режим питания (Фаза 20)
  - Наставления врача (текстовые `notes` из плана)
- Ответ: 3–5 конкретных продуктов/блюд с КБЖУ, которые закроют дефицит

### 19.2 Rate limiting и стоимость

- Лимит: **3 запроса в сутки** на пользователя (настраивается в `.env`: `AI_ADVICE_DAILY_LIMIT`)
- Счётчик сбрасывается в 00:00 МСК
- Результат кешируется на 30 минут (одинаковые входные данные → тот же ответ)

---

## Фаза 20 — Профиль питания и ограничения

> **Статус:** ✅ Реализовано (v2.9.0)
> **Приоритет:** Средний
> **Сложность:** Низкая
> **Зависимость:** Фаза 17 (профиль пользователя)

### 20.1 Пищевые ограничения и непереносимости

- В настройках профиля: секция «Особенности питания»
- Чекбоксы + произвольный текст:

  | Категория               | Примеры                                       |
  | ----------------------- | --------------------------------------------- |
  | Непереносимости         | лактоза, глютен, орехи, морепродукты          |
  | Режим питания           | вегетарианство, веганство, халяль, кошер      |
  | Медицинские ограничения | диабет, подагра (соль/пурины), почечная диета |
  | Произвольный текст      | «не ем свинину», «аллергия на клубнику»       |

- Хранится в `user_profiles.dietary_restrictions` (JSON-массив тегов + free text)

### 20.2 Интеграция с AI

- При каждом вызове `/api/analyze` (определение КБЖУ блюда) — ограничения передаются в системный промпт
- При вызове AI-советника (Фаза 19) — ограничения учитываются в рекомендациях
- Если блюдо содержит запрещённый ингредиент — AI предупреждает (мягко, не блокирует)

---

---

## UX-6 — День недели в карусели дат

> **Статус:** ✅ Реализовано (v2.8.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая

- В карусели дат на главной странице дневника каждая ячейка показывает **день недели + дату**:
  ```
  Ср
  25.06
  ```
- Активный день выделен (уже есть), добавляется строка с сокращённым названием дня: Пн/Вт/Ср/Чт/Пт/Сб/Вс
- В заголовке открытого дня — полный формат: **«Среда, 25 июня 2026»**
- В date-picker при ручном выборе даты — в выпадающем календаре тоже показывать день недели
- Локаль: русская (`ru-RU`), неделя начинается с понедельника

---

## UX-7 — Каталог еды пользователя (My Food Catalog)

> **Статус:** ✅ Реализовано (v2.17.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Зависимость:** Фаза 15 (кабинет врача — для доступа врача к каталогу)

### UX-7.1 Сохранение в каталог

- На карточке **отдельной записи питания** (meal) — кнопка «⭐ Сохранить в каталог»
- На карточке **приёма пищи целиком** (например, весь завтрак) — кнопка «Сохранить набор в каталог»
- При сохранении пользователь указывает **название шаблона**: «Мой завтрак», «Овсянка стандарт», «Обед на работе»
- КБЖУ сохраняются как есть (скопированы из оригинальной записи)
- Одна запись может быть сохранена многократно под разными названиями

**Новые таблицы БД:**

```
food_catalog_items (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- название шаблона
  description TEXT,                  -- опционально
  is_set      BOOLEAN DEFAULT false,  -- false = блюдо, true = набор (несколько позиций)
  created_at  TEXT NOT NULL
)

food_catalog_entries (
  id              INTEGER PRIMARY KEY,
  catalog_item_id INTEGER REFERENCES food_catalog_items(id) ON DELETE CASCADE,
  meal_name       TEXT NOT NULL,
  grams           REAL,
  kcal            REAL,
  protein         REAL,
  fat             REAL,
  carbs           REAL
)
```

### UX-7.2 Выбор из каталога при новой записи

- В форме добавления записи питания — кнопка «📋 Из каталога»
- Открывается модальное окно со списком сохранённых шаблонов (поиск по названию)
- Пользователь выбирает шаблон → данные подставляются в форму автоматически
- Можно скорректировать граммовку / КБЖУ перед сохранением
- Если выбран набор — создаётся несколько записей питания одновременно

### UX-7.3 Управление каталогом

- Отдельная страница `/catalog` (или раздел в настройках профиля)
- Список шаблонов с КБЖУ, фильтр по типу (блюдо / набор), поиск
- Редактирование названия и описания шаблона
- Удаление шаблона (записи в дневнике не затрагиваются)
- Счётчик «использовано X раз»

**Новые маршруты:**

```
GET    /api/catalog                     — список шаблонов пользователя
POST   /api/catalog                     — создать шаблон (из meal или набора)
PUT    /api/catalog/:id                 — переименовать / изменить описание
DELETE /api/catalog/:id                 — удалить шаблон
GET    /api/doctor/patients/:id/catalog — врач просматривает каталог пациента (read-only)
```

### UX-7.4 Доступ врача

- Врач видит каталог пациента в режиме **только чтение** (на странице пациента)
- Врач может **рекомендовать** шаблон из каталога пациента: добавляет пометку «Рекомендую использовать чаще» (текстовый комментарий к шаблону)
- Назначить блюдо из каталога как часть плана питания (Фаза 18)

---

## UX-8 — Автовысота комментария дня в Excel-отчёте

> **Статус:** ✅ Реализовано (v2.8.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая

- В Excel-отчёте ячейка «Общий комментарий дня» включает `wrapText: true` и `row.height` устанавливается динамически пропорционально длине текста
- Минимальная высота строки — 20pt (одна строка), максимум не ограничен
- Формула расчёта высоты: `Math.max(20, Math.ceil(text.length / 60) * 15)` (настраивается)
- Шрифт и ширина колонки комментария фиксированы, чтобы перенос был предсказуемым
- Применяется и в дневном отчёте, и в листах-по-дням расширенного отчёта (Фаза 21)

---

## UX-9 — Футер и Legal-разделы

> **Статус:** ✅ Реализовано (v2.8.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая

### UX-9.1 Десктоп — тёмный футер внизу страницы

Четыре колонки в стиле корпоративного footer (см. образец Razer/Gametrica):

| Колонка                 | Содержимое                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Правообладатель**     | ИП Сердитых Глеб Будимирович, ИНН 502716046892                                                       |
| **Социальные сети**     | [Telegram](https://t.me/razbudimircraft) · [ВКонтакте](https://vk.com/boudimir)                      |
| **Обратная связь**      | Иконка «на реконструкции» + текст «Почта для связи появится позднее»                                 |
| **Правовая информация** | Ссылка на 152-ФЗ / Политика конфиденциальности · «Данные хранятся на серверах VK Cloud в Москве, РФ» |

Нижняя строка (копирайт):

```
© 2026 ИП Сердитых Глеб Будимирович. Все права защищены.
Создано с использованием генеративного ИИ и самописного кода.
```

### UX-9.2 Мобильная версия — раздел «О приложении»

- Отдельный экран в навигации (иконка ℹ️ в BottomNav или пункт меню профиля)
- Те же блоки, но в вертикальном списке с разделителями:
  - **Правообладатель** — ИП Сердитых Глеб Будимирович, ИНН 502716046892
  - **Социальные сети** — кнопки с иконками TG и VK
  - **Обратная связь** — статус «на реконструкции»
  - **Персональные данные (152-ФЗ)** — ссылка на `/privacy`, краткое пояснение
  - **О приложении** — «Создано с использованием генеративного ИИ и самописного кода. Все права принадлежат ИП Сердитых Глеб Будимирович.»

### UX-9.3 Страница /privacy (152-ФЗ)

Реализуется в рамках Фазы 16, UX-9 добавляет ссылки на неё из футера и мобильного раздела.

Ключевые тезисы для страницы:

- Оператор: ИП Сердитых Глеб Будимирович, ИНН 502716046892
- Данные хранятся на серверах **VK Cloud Solutions**, Москва, Российская Федерация
- Обработка персональных данных осуществляется в соответствии с **Федеральным законом № 152-ФЗ «О персональных данных»**
- Собираемые данные: имя пользователя (логин), данные дневника питания
- Данные не передаются третьим лицам, за исключением DeepSeek API (только текстовое описание блюда, без персональных идентификаторов)
- Права субъекта: запрос на удаление/выгрузку данных через настройки профиля

## UX-10 — Редактирование приёма пищи через всплывающее окно (мобильная версия)

> **Статус:** ✅ Реализовано (v2.17.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Затрагивает:** DiaryPage (мобильная карточка приёма)

### Проблема

На мобильных устройствах при редактировании приёма пищи пользователю неочевидно, что нужно прокрутить страницу вниз — форма редактирования рендерится под карточкой приёма, что нарушает UX-паттерн мобильных приложений.

### Решение

Заменить инлайн-редактирование на модальное окно (bottom sheet / dialog), которое всплывает поверх основного контента.

### Подзадачи

#### UX-10.1 Bottom Sheet для мобильной версии

- Использовать `<Dialog>` / `<Sheet>` из shadcn/ui или реализовать bottom sheet через `fixed bottom-0`
- При нажатии «Редактировать» на карточке приёма — открывать модал поверх контента
- Модал содержит те же поля, что и текущая форма редактирования
- Кнопки «Сохранить» и «Отмена» зафиксированы внизу модала
- Backdrop-клик закрывает модал (с подтверждением если есть несохранённые изменения)

#### UX-10.2 Десктоп — без изменений

- На десктопе текущее поведение (инлайн-форма) остаётся без изменений
- Брейкпоинт разделения: `md` (768px) по Tailwind

#### UX-10.3 Анимация

- Bottom sheet появляется снизу с анимацией `slide-up` (transform translateY)
- Закрытие — обратная анимация `slide-down`

---

## UX-11 — Добавление приёма пищи в каталог прямо из дневника

> **Статус:** ✅ Реализовано (v2.17.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Затрагивает:** DiaryPage (карточка приёма), CatalogPage

### Проблема

Каталог продуктов реализован (UX-7), но добавить конкретный пункт «что ел» / «что пил» из уже сохранённого приёма в каталог невозможно — соответствующей кнопки нет. Также в самом каталоге отсутствует кнопка ручного добавления позиции.

### Решение

Добавить кнопку «Сохранить в каталог» на уровне отдельной позиции приёма пищи (еда/напиток), а также кнопку ручного добавления в самом каталоге.

### Подзадачи

#### UX-11.1 Кнопка «+ в каталог» у позиции приёма

- На карточке каждой позиции (food/drink item) внутри сохранённого приёма — небольшая иконка-кнопка (bookmark / +catalog)
- При нажатии — prefill форма каталога данными из позиции (название, КБЖУ если рассчитаны)
- Подтверждение: всплывающий toast «Добавлено в каталог» или модал с возможностью уточнить данные
- Если позиция уже есть в каталоге (по названию) — предупреждение «Уже в каталоге, добавить дубль?»

#### UX-11.2 Ручное добавление в каталоге

- Если в CatalogPage ещё нет кнопки «Добавить вручную» — добавить
- Форма: название блюда/продукта, опционально КБЖУ на 100г или на порцию, единица измерения
- Сохранение через существующий `POST /api/catalog` (или аналогичный)

#### UX-11.3 Backend

- Эндпоинт `POST /api/catalog/items` принимает `{ name, kcal?, protein?, fat?, carbs?, unit? }`
- Дедупликация по имени (case-insensitive) с предупреждением на фронте

---

## UX-12 — Кнопка «Рассчитать КБЖУ по всему дню»

> **Статус:** ✅ Реализовано (v2.17.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая
> **Затрагивает:** DiaryPage (шапка дня / футер дня)

### Проблема

Если пользователь забыл нажать «Рассчитать КБЖУ» у одного или нескольких приёмов — нужно заходить в каждый и жать отдельно. Нет возможности одной кнопкой запустить расчёт для всех нерассчитанных приёмов за день.

### Решение

Добавить кнопку «Рассчитать КБЖУ за день» в шапку или футер секции дня, которая последовательно запускает расчёт КБЖУ для всех приёмов дня, у которых он ещё не выполнен.

### Подзадачи

#### UX-12.1 Кнопка в UI

- Размещение: рядом с итоговым КБЖУ дня (шапка дня на DiaryPage) или в контекстном меню дня
- Активна только если хотя бы один приём за день не имеет рассчитанного КБЖУ
- Иконка: `Sparkles` или `Calculator` + текст «Рассчитать всё за день»

#### UX-12.2 Логика фронтенда

- Получить список приёмов за выбранный день
- Отфильтровать те, у которых `kcal === null` (или аналогичное поле)
- Последовательно (или параллельно с rate-limit) вызвать `POST /api/meals/{id}/calculate` для каждого
- Прогресс-индикатор: «Рассчитывается 2/5...»
- По завершении — toast «КБЖУ рассчитано для N приёмов»

#### UX-12.3 Backend (если нужен batch-эндпоинт)

- Опционально: `POST /api/meals/batch-calculate` принимает `{ date: "YYYY-MM-DD" }`, возвращает результаты для всех приёмов дня без КБЖУ
- Сокращает количество HTTP-запросов при большом числе приёмов

---

## UX-13 — Отображение версии приложения

> **Статус:** ✅ Реализовано (v2.17.0)
> **Приоритет:** Средний
> **Сложность:** Низкая
> **Затрагивает:** Футер (десктоп), раздел «О приложении» (мобайл)

### Проблема

Пользователь не видит, какую версию приложения использует. Важно для поддержки (какую версию воспроизвести), для разработчика (быстрое определение версии на проде), для пользователя (уверенность что работает актуальная версия).

### Решение

Версия читается из `package.json` в время сборки (через Vite `define` или `import.meta.env`) — не хардкодится, всегда актуальна в бандле.

### Подзадачи

#### UX-13.1 Источник версии

- В `vite.config.ts` добавить `define`:
  ```ts
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  }
  ```
- В `client/src/vite-env.d.ts` добавить `declare const __APP_VERSION__: string;`
- Версия в сборке всегда соответствует `version` в `package.json`

#### UX-13.2 Десктоп — футер

- В существующем футере (UX-9.1) добавить в строку копирайта:
  ```
  © 2026 ИП Сердитых Глеб Будимирович. Все права защищены. · v2.11.0
  ```
- Формат: `v{__APP_VERSION__}` маленьким серым текстом (`text-xs text-gray-500`)
- На десктопе версия видна всегда (футер есть на каждой странице)

#### UX-13.3 Мобайл — раздел «О приложении»

- В мобильном разделе «О приложении» (UX-9.2 / AboutPage) добавить строку:
  ```
  Версия: v2.11.0
  ```
- Отображается отдельной строкой в блоке «О приложении»
- При нажатии на версию — копировать в буфер (для отправки в суппорт)

#### UX-13.4 Требования к отображению

- Версия не должна переноситься на новую строку — всегда в одну строку с остальными данными
- На узких экранах — футер скрывается за BottomNav (проверить отсутствие перекрытия)
- Темная тема: версия должна быть читаема в обоих темах

---

## UX-14 — Дата нового приёма пищи по умолчанию = выбранный день

> **Статус:** ✅ Реализовано (v2.18.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая
> **Затрагивает:** MealForm / DiaryPage
> **Источник:** Пользовательское замечание, 5 июля 2026

### Описание

Когда пользователь переключается на другой день в карусели дат и создаёт новый приём пищи, форма открывается с дефолтной датой = сегодня. Это неудобно при ретроспективном заполнении — пользователь вынужден вручную менять дату каждый раз.

### Ожидаемое поведение

- Если пользователь находится на дне X (не сегодня), форма нового приёма открывается с датой X по умолчанию.
- Если пользователь на сегодняшнем дне — дефолт остаётся сегодня.
- Поле даты остаётся редактируемым: пользователь может изменить дату вручную (например, перенести запись в другой день).

### Подзадачи

#### UX-14.1 Передача выбранного дня в форму

- В `DiaryPage` текущая выбранная дата хранится в стейте (`selectedDate`).
- При открытии `MealForm` (новый приём) передавать `defaultDate={selectedDate}` вместо `new Date()`.

#### UX-14.2 MealForm — принимает `defaultDate` prop

- Добавить prop `defaultDate?: Date` в `MealForm`.
- Инициализировать поле даты из `defaultDate ?? new Date()`.

#### UX-14.3 Тест

- Перейти на вчерашний день → нажать «Добавить приём» → убедиться, что дата в форме = вчера.
- Убедиться, что дату можно изменить вручную.

---

## UX-15 — Форма добавления приёма в начале страницы (не внизу списка)

> **Статус:** ✅ Реализовано (v2.18.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Затрагивает:** DiaryPage
> **Источник:** Пользовательское замечание, 5 июля 2026

### Описание

Сейчас новый приём пищи добавляется в конец списка. При наличии 3–4 записей за день кнопка «Добавить» и открывающаяся форма уходят ниже экрана — пользователь не видит, что произошло, и вынужден прокручивать вниз.

### Ожидаемое поведение

- Форма добавления нового приёма располагается **под блоком «Цель на сегодня»**, то есть всегда видна без прокрутки.
- Список существующих приёмов отображается ниже формы.
- Такой порядок: **[Цель на сегодня] → [Форма нового приёма] → [Список записанных приёмов]**.

### Подзадачи

#### UX-15.1 Переставить порядок компонентов в DiaryPage

- Переместить блок `MealForm` / кнопку «Добавить приём» выше списка `MealCard`-ов.
- Убедиться, что на мобильном форма не перекрывается `BottomNav`.

#### UX-15.2 Проверка на мобильном и десктопе

- При 0 записях: форма видна сразу.
- При 5+ записях: форма по-прежнему вверху, список прокручивается ниже.

---

## UX-16 — Кнопка «Добавить фото» в форме создания приёма

> **Статус:** ✅ Реализовано (v2.18.0)
> **Приоритет:** Высокий
> **Сложность:** Низкая
> **Затрагивает:** MealForm
> **Источник:** Пользовательское замечание, 5 июля 2026

### Описание

Сейчас добавить фото к приёму пищи можно только через редактирование уже созданной карточки. При создании нового приёма такой возможности нет, что вынуждает делать два шага: сначала сохранить, потом открыть на редактирование и прикрепить фото.

### Ожидаемое поведение

- В форме создания приёма пищи (`MealForm`) присутствует кнопка / область «Добавить фото».
- Поведение аналогично существующей логике в карточке редактирования (выбор файла → загрузка в S3 → превью).
- Фото прикрепляется к приёму сразу при создании.

### Подзадачи

#### UX-16.1 Добавить поле `photoUrl` в форму MealForm

- Добавить `<input type="file">` (или shadcn-обёртку) в `MealForm`.
- После выбора файла — загрузить через `POST /api/photos/upload` (существующий эндпоинт), получить URL.
- Сохранять URL в локальном стейте формы до сабмита.

#### UX-16.2 Передать `photoUrl` при создании приёма

- В теле запроса `POST /api/meals` передавать `photoUrl` если выбрано фото.
- Бэкенд уже поддерживает поле `photoUrl` в таблице.

#### UX-16.3 Превью фото в форме

- Показывать thumbnail выбранного фото внутри формы до сохранения.
- Кнопка «Удалить фото» рядом с превью.

#### UX-16.4 Тест

- Создать приём → прикрепить фото → сохранить → карточка сразу показывает фото без редактирования.

---

## UX-17 — Мультифото: до 5 фотографий на приём + компактные превью

> **Статус:** 📋 Запланировано
> **Приоритет:** Средний
> **Сложность:** Средняя
> **Связано с:** UX-16 (фото при создании), Фаза 23 (S3 хранилище)

### Зачем

Сейчас к приёму пищи можно прикрепить только одну фотографию. Пользователи хотят фотографировать блюдо целиком и каждую позицию отдельно (например: тарелка + упаковка продукта + этикетка). Кроме того, существующее превью занимает много места на карточке.

### UX-17.1 Множественный выбор файлов

- Поле загрузки фото принимает до 5 файлов одновременно (`multiple`, `accept="image/*"`)
- Ограничение: не более 5 фото на один приём; при превышении — тост с предупреждением
- Каждый файл проходит валидацию по типу (JPEG/PNG/WebP/HEIC) и размеру (≤ 50 МБ, как сейчас)
- Порядок фотографий сохраняется (поле `sort_order` в таблице `meal_photos`)

### UX-17.2 Компактная галерея превью

- Превью в форме создания/редактирования: сетка 3-колонки, каждая миниатюра ~60×60 px (сейчас ~120-140 px)
- На карточке приёма в дневнике — горизонтальный скролл-ряд thumbnail'ов ~56×56 px
- Первое фото открывается по клику в полноэкранный lightbox; навигация влево/вправо между фотографиями
- Кнопка удаления (×) на каждой миниатюре в режиме редактирования

### UX-17.3 Backend: таблица `meal_photos`

- Если уже реализована таблица `meal_photos` (Фаза 23) — расширить до поддержки нескольких строк на один `meal_id`
- Если нет — создать: `id`, `meal_id FK`, `user_id FK`, `photo_url`, `sort_order INTEGER DEFAULT 0`, `created_at`
- `GET /api/meals/:id` и список приёмов — включать массив `photos[]` в ответ
- `POST /api/meals/:id/photos` — добавить фото к уже созданному приёму (возвращает обновлённый список)
- `DELETE /api/meals/:mealId/photos/:photoId` — удалить конкретное фото

### UX-17.4 Миграция существующих данных

- Поле `photo_url` в таблице `meals` → при запуске мигрировать существующие фото в `meal_photos` (guarded DDL)
- После успешной миграции `photo_url` в `meals` оставить как deprecated-колонку (не удалять — обратная совместимость)

### UX-17.5 Тест

- Создать приём → добавить 3 фото → сохранить → карточка показывает 3 thumbnail'а
- Попытка добавить 6-е фото → блокировка + тост «Максимум 5 фотографий"
- Удалить одно фото из редактирования → остальные сохраняются

---

## UX-18 — AI-анализ фотографии блюда: автоматический расчёт КБЖУ по фото

> **Статус:** 📋 Запланировано
> **Приоритет:** Высокий
> **Сложность:** Высокая
> **Зависит от:** UX-16/UX-17 (загрузка фото), Фаза 25 (dual-AI архитектура)

### Зачем

Сейчас пользователь вводит название блюда текстом и нажимает «Рассчитать КБЖУ» — DeepSeek анализирует текст. Если приложено фото, оно никак не участвует в расчёте КБЖУ. Визуальный анализ позволит: получить КБЖУ сразу при загрузке фото без текстового описания, уточнить расчёт (видно размер порции, ингредиенты), снизить количество ручного ввода.

### UX-18.1 Провайдеры Vision API

**DeepSeek Vision (основной)**

- Модель `deepseek-vl2` или `deepseek-chat` с vision capability
- Формат запроса: multipart с base64-encoded image в `content[].image_url`
- Промпт: «Определи блюдо на фото. Оцени КБЖУ на порцию (ккал, белки, жиры, углеводы в граммах). Отвечай JSON: `{"dish": "...", "calories": N, "protein": N, "fat": N, "carbs": N, "confidence": "low|medium|high"}`»
- Fallback: если DeepSeek Vision недоступен или модель не поддерживает изображения — передать текст «[Фото приёма пищи загружено]» + имеющееся описание блюда

**GigaChat Vision (резервный, Фаза 25)**

- GigaChat поддерживает multimodal через `GigaChat-Pro` (модель с vision)
- Изображение передаётся как `file_id` через предварительную загрузку в `/files` endpoint
- Подключается через абстракцию `server/ai.ts` (см. Фазу 25) при `AI_PROVIDER=gigachat` или `auto`

### UX-18.2 Серверная логика

```
POST /api/photos/analyze-kbju
Body: { photoUrl: string }   // уже загруженное фото (S3 URL или base64)
Response: { dish, calories, protein, fat, carbs, confidence, provider }
```

- Скачать фото по URL в память (или принять base64 напрямую)
- Изменить размер до ≤ 1024 px по длинной стороне перед отправкой в AI (снизить стоимость токенов)
- Логировать вызов в `api_usage` с `provider=deepseek-vision` или `provider=gigachat-vision`
- Обрабатывать `confidence: low` — показывать предупреждение пользователю «Оценка приблизительна, уточните вручную»
- Rate limiting: не более 10 vision-запросов в час на пользователя (vision дороже текстовых)

### UX-18.3 UI — кнопка «Рассчитать КБЖУ по фото»

- В форме создания/редактирования приёма, рядом с существующей кнопкой «Рассчитать КБЖУ»:
  - Если фото загружено → появляется кнопка «📷 По фото» (иконка камеры)
  - Если фото не загружено → кнопка скрыта или задизейблена с tooltip «Сначала добавьте фото»
- При нажатии → spinner → заполнить поля КБЖУ и название блюда из ответа AI
- Показать badge «AI по фото» рядом с заполненными полями, чтобы пользователь понимал что данные автоматические
- При `confidence: low` → жёлтый badge «Приблизительно» + возможность вручную скорректировать

### UX-18.4 Промпт-инжиниринг

- Промпт должен учитывать контекст пользователя из анкеты (Фаза 17): если человек на диете — акцент на точность ккал
- Явно просить confidence score — для прозрачности и обратной связи пользователю
- Если на фото несколько блюд — возвращать суммарный КБЖУ + список распознанных блюд
- Форс-JSON формат ответа: `response_format: { type: "json_object" }` для DeepSeek; regex fallback для GigaChat

### UX-18.5 Конфигурация `.env.example`

```bash
# Vision AI (UX-18)
VISION_ENABLED=true               # false — скрывает кнопку «По фото» в UI
VISION_MAX_IMAGE_SIZE_PX=1024     # ресайз перед отправкой в AI
VISION_RATE_LIMIT_PER_HOUR=10    # vision-вызовов на пользователя в час
```

### UX-18.6 Тест

- Загрузить фото тарелки гречки → нажать «По фото» → КБЖУ заполнились автоматически
- Загрузить нечёткое фото → получить `confidence: low` → предупреждение в UI
- Отключить `VISION_ENABLED=false` → кнопка «По фото» скрыта, остальное работает как прежде

---

## UX-19 — Отображение фото на карточках + фото и ссылки в Excel-отчёте

> **Статус:** 📋 Запланировано
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Связано с:** UX-16/UX-17 (загрузка фото), Фаза 21 (расширенные отчёты), Фаза 23 (S3)

### Зачем

Фото загружается и хранится в S3, но никак не отображается на карточке приёма пищи в дневнике — пользователь не видит ни превью, ни индикатора, что фото прикреплено. В Excel-отчёте фото отсутствуют полностью, хотя врачу и пользователю важно видеть визуальный контекст питания.

### UX-19.1 Карточка приёма в дневнике

- Если к приёму прикреплено фото — показать thumbnail ~56×56 px в правом углу карточки (или под названием блюда)
- При нескольких фото (UX-17) — горизонтальная полоска thumbnail'ов с `overflow-x: auto`
- Клик по thumbnail → lightbox с полным фото (и навигацией, если фото несколько)
- Если фото не загружено — карточка выглядит как сейчас (без пустого места)
- Индикатор 📷 на карточке (иконка без загрузки самого фото) для ленивой подгрузки

### UX-19.2 Форма редактирования

- В режиме редактирования существующего приёма — показать уже прикреплённые фото с кнопкой удаления (×) на каждой миниатюре
- Галерея в той же сетке 3-колонки ~60×60 px (синхронно с UX-17)

### UX-19.3 Excel-отчёт — миниатюры и ссылки

**Встроенные миниатюры:**

- В строке каждого приёма пищи — дополнительная ячейка «Фото»
- Скачать фото из S3, ресайзить до ~80×80 px (Lanczos), вставить в ячейку через `exceljs` `addImage()`
- Высота строки устанавливается автоматически под размер вставленного изображения (~65 pt)
- Если фото нет — ячейка пустая, высота стандартная

**Ссылки на оригинал:**

- В той же ячейке (или соседней) — гиперссылка `HYPERLINK(url, "Открыть фото")` на оригинальный S3 URL
- При нескольких фото (UX-17) — несколько строк ссылок в одной ячейке или ячейки разделены переносом

**Реализация:**

```typescript
// exceljs: вставка изображения в ячейку
const imageId = workbook.addImage({ buffer: imageBuffer, extension: "jpeg" });
worksheet.addImage(imageId, {
  tl: { col: photoColIndex, row: rowIndex },
  ext: { width: 80, height: 80 },
});
worksheet.getRow(rowIndex + 1).height = 65;
```

- Ресайз через пакет `sharp` (уже используется в проекте для EXIF-strip) или `jimp`
- Параллельная загрузка фото из S3 с timeout 5s на фото (при ошибке — пустая ячейка)
- Общий лимит: не более 50 фото на один отчёт (защита от огромных файлов)

### UX-19.4 Конфигурация

```bash
# Excel photo export (UX-19)
EXCEL_PHOTO_ENABLED=true          # false — отключает загрузку фото в Excel (быстрее генерация)
EXCEL_PHOTO_MAX_PER_REPORT=50     # лимит фото на один отчёт
EXCEL_PHOTO_SIZE_PX=80            # размер миниатюры в Excel (px)
```

### UX-19.5 Тест

- Создать приём с фото → карточка в дневнике показывает thumbnail
- Клик по thumbnail → lightbox
- Скачать Excel → в строке приёма видна миниатюра фото + гиперссылка на S3
- Приём без фото → ячейка «Фото» пустая
- Отключить `EXCEL_PHOTO_ENABLED=false` → фото в Excel нет, ссылки остаются

---

## UX-20 — Ручной приоритет в целевых КБЖУ анкеты (не перезаписывать вручную заданные значения)

> **Статус:** 📋 Запланировано
> **Приоритет:** Высокий
> **Сложность:** Низкая
> **Связано с:** Фаза 17 (анкета), Фаза 18 (таргет КБЖУ от врача)

### Зачем

Сейчас при изменении любого параметра анкеты (рост, вес, активность) автоматически пересчитывается и перезаписывается целевой КБЖУ по формуле Миффлина-Сан Жеора. Пользователь, который вручную установил свои целевые значения, теряет их при малейшем изменении анкеты. Нужно разделить «расчётные» и «ручные» значения и дать пользователю контроль.

### UX-20.1 Логика приоритетов

- Поля целевых КБЖУ (`target_kcal`, `target_protein`, `target_fat`, `target_carbs`) имеют два режима:
  - **«Ручной»** — пользователь ввёл значения сам; автопересчёт НЕ затирает их
  - **«Авторасчёт»** — значения вычислены по формуле; при изменении анкеты обновляются автоматически
- Новое поле в `user_profiles`: `kbju_manual BOOLEAN DEFAULT false`
  - `false` = авторасчёт; при изменении роста/веса/активности — пересчитывается
  - `true` = ручной; изменение роста/веса/активности НЕ трогает КБЖУ-поля

### UX-20.2 UI — форма анкеты

**Секция «Целевые КБЖУ»:**

- Четыре поля ввода (ккал, белки, жиры, углеводы) — всегда редактируемые
- Под полями — кнопка **«Рассчитать по формуле»** (inactive серым, если рост/вес не заполнены)
- При нажатии на кнопку → поля заполняются расчётом Миффлина + флаг сбрасывается в `false`
- Если пользователь после этого изменяет любое поле вручную → флаг становится `true`
- Визуальный индикатор рядом с полями:
  - 🔢 «Рассчитано автоматически» (серый бейдж) — когда `kbju_manual = false`
  - ✏️ «Задано вручную» (синий бейдж) — когда `kbju_manual = true`
- Tooltip на бейдже: «Нажмите "Рассчитать по формуле" чтобы обновить автоматически»

### UX-20.3 Серверная логика

- `PUT /api/profile/questionnaire` принимает `kbju_manual?: boolean` в теле
- Если в запросе нет полей КБЖУ и `kbju_manual` не передан — не трогать текущее состояние флага
- Если переданы новые значения роста/веса/активности и `kbju_manual = false` — пересчитать и обновить КБЖУ
- Если переданы новые значения роста/веса/активности и `kbju_manual = true` — обновить только антропометрию, КБЖУ не трогать
- Если в запросе явно переданы поля КБЖУ — сохранить их и установить `kbju_manual = true`

### UX-20.4 Миграция

- Добавить колонку `kbju_manual BOOLEAN DEFAULT false` в `user_profiles` через guarded DDL
- Существующие пользователи: считать `kbju_manual = false` (авторасчёт, без изменений)

### UX-20.5 Тест

- Ввести вручную ккал 1800 → сохранить → поменять активность → сохранить → ккал остался 1800, бейдж «Задано вручную»
- Нажать «Рассчитать по формуле» → ккал пересчитался по Миффлину, бейдж «Рассчитано автоматически»
- Снова изменить ккал вручную → бейдж переключается на «Задано вручную»

---

## UX-21 — Расчёт КБЖУ для позиций каталога еды через AI

> **Статус:** 📋 Запланировано
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Зависимость:** Фаза 22 (FatSecret API — опционально), Фаза 25 (GigaChat — опционально)

### Зачем

Пользователь ведёт каталог блюд, но не знает их КБЖУ. Если у блюда указан ресторан или конкретное название, AI должна найти или рассчитать КБЖУ максимально близко к реальному — в том числе по публичным данным конкретного заведения.

### Функциональность

#### UX-21.1 Кнопка «Рассчитать КБЖУ» в карточке каталога

- На странице редактирования позиции каталога ( / ) добавить кнопку **«Рассчитать КБЖУ»**
- Кнопка активна всегда, когда у позиции есть или
- Результат: поля заполняются автоматически (с возможностью ручной правки перед сохранением)

#### UX-21.2 Логика выбора источника КБЖУ

| Условие                                         | Источник                                                            | Приоритет |
| ----------------------------------------------- | ------------------------------------------------------------------- | --------- |
| В или упомянут ресторан/кафе + конкретное блюдо | AI ищет КБЖУ по ресторану (DeepSeek web-search режим или FatSecret) | 1         |
| Есть конкретное название блюда без ресторана    | DeepSeek анализирует по названию и составу                          | 2         |
| Только общее описание                           | DeepSeek оценивает по описанию, возвращает диапазон                 | 3         |

#### UX-21.3 Серверный endpoint

- Берёт + из каталога
- Определяет стратегию (ресторан / блюдо / описание)
- Отправляет prompt в DeepSeek с инструкцией вернуть JSON
- Возвращает результат клиенту, **не сохраняет автоматически** — пользователь сам нажимает «Сохранить»
- — строка для отображения: «По данным Burger King», «Оценка по составу», «Среднее значение»

#### UX-21.4 UI результата

- Под кнопкой появляется карточка с рассчитанными значениями и
- Поля КБЖУ редактируемы (можно скорректировать перед сохранением)
- Кнопка «Применить» сохраняет в каталог

### Промпт для AI

### Тесты

- Unit: парсинг JSON-ответа от AI, валидация полей
- Integration: mock DeepSeek → endpoint возвращает КБЖУ
- Edge cases: AI вернул некорректный JSON, ресторан не найден, пустое описание

---

## UX-22 — PDF-экспорт аналитики (красивый отчёт вместо Ctrl+P)

> **Статус:** ✅ Реализовано (v2.22.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Зависимость:** Фаза 11 (аналитика реализована)

### Зачем

Сейчас пользователь делает PDF через Ctrl+P → «Сохранить как PDF» в браузере. Это ненадёжно: в PDF попадают навигационные элементы, шапка, кнопки. Нужна кнопка «Скачать PDF» прямо в разделе Аналитики, которая генерирует красивый документ на сервере.

### UX-22.1 Точки входа (где появляется кнопка)

- **Раздел «Аналитика»** (`/analytics`) — кнопка «Скачать PDF» рядом с переключателем периода
- Периоды: **неделя / месяц / произвольный диапазон** (date range picker, тот же что в аналитике)
- Формат: `food-diary-analytics-2026-06-01_2026-06-28.pdf`

### UX-22.2 Структура PDF-документа

**Страница 1 — Обложка**

- Заголовок: «Дневник питания — Аналитика»
- Период: «01.06.2026 — 28.06.2026 (28 дней)»
- Пользователь (имя/displayName)
- Дата генерации

**Страница 2 — Сводка периода**

- Итого / среднее в день: калории, белки, жиры, углеводы, вода, сон
- Блоки как на странице аналитики: KPI-карточки с дельтами к норме
- Выполнение цели по калориям: X из Y дней в норме

**Страница 3+ — Графики (PNG → embed в PDF)**

- График калорий по дням (line chart)
- График Б/Ж/У по дням (stacked bar)
- Распределение типов приёмов (завтрак/обед/ужин/перекус)
- График воды по дням

**Последняя страница — Детализация по дням**

- Компактная таблица: дата | калории | Б/Ж/У | вода | сон | кол-во приёмов
- Строки с отклонением > 20% от нормы выделены цветом

### UX-22.3 Технический подход

**Вариант A — Серверная генерация через ReportLab / puppeteer:**

```
GET /api/report/analytics-pdf?mode=week&date=2026-06-28
GET /api/report/analytics-pdf?mode=month&date=2026-06-28
GET /api/report/analytics-pdf?mode=range&start=2026-06-01&end=2026-06-28
```

- Сервер формирует данные аналитики (те же что отдаёт `/api/analytics`)
- Генерирует графики через `chartjs-node-canvas` (server-side Chart.js → PNG)
- Собирает PDF через `pdfkit` или `@jspdf/jspdf` + таблицы через `pdfkit-table`
- Стримит как `application/pdf`

**Вариант B — Print-ready HTML → браузер:**

- Endpoint `/api/report/analytics-html?...` отдаёт HTML со встроенными стилями `@media print`
- Клиент открывает в новом окне и вызывает `window.print()`
- Проще, но менее контролируемо (зависит от браузера)

**Рекомендация:** Вариант A — даёт одинаковый результат на всех устройствах и позволяет встроить реальные графики.

### UX-22.4 Дизайн документа

- Цветовая схема приложения (teal `#01696F` как акцент)
- Шрифт: Inter (embed TTF)
- Логотип / иконка приложения в шапке
- Нумерация страниц
- QR-код со ссылкой на раздел аналитики (опционально)

### Тесты

- Unit: формирование структуры данных для PDF
- Integration: endpoint возвращает `Content-Type: application/pdf`, ненулевой body
- Edge cases: период без данных, один день, максимальный период (90 дней)

---

## UX-22b — PDF аналитики с полноценными графиками (как в приложении)

> **Статус:** ✅ Реализовано (v2.23.0)
> **Приоритет:** Средний
> **Сложность:** Высокая
> **Зависимость:** UX-22 (базовая PDF реализована v2.22.1)

### Зачем

Текущий PDF (введён в v2.22.0, исправлен в v2.22.1) содержит только KPI-карточки, примитивный бар-чарт и таблицу по дням — без графиков. Пользователь хочет полноценный вывод — такой же, как в разделе Аналитики приложения, с всеми 6 блоками и реальными графиками.

### UX-22b.1 Технический подход

**Генерация графиков на сервере** через `chartjs-node-canvas` (Chart.js без браузера) → PNG-буферы → встраиваются в PDF через `doc.image(buffer, x, y, { width })`.

```bash
npm install chartjs-node-canvas chart.js
```

`chartjs-node-canvas` работает через `canvas` (node-canvas). В Docker-образе нужны системные зависимости Cairo/Pango — `Dockerfile.api` нужно дополнить:

```dockerfile
# В apt-get install добавить:
RUN apt-get update && apt-get install -y curl sqlite3 libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg-dev libgif-dev && rm -rf /var/lib/apt/lists/*
```

### UX-22b.2 Структура PDF (по образцу приложения)

**Страница 1 — Обложка + KPI-карточки** (4 шт., как сейчас)

- Заполнено дней X/Y, ср. ккал, сон/вода, стрик/приёмы

**Страница 2 — Блок 1: Сон**

- Линейный график подъём/отбой по дням
- Бар-чарт: продолжительность сна по дням + area chart (накопленный долг)
- Цифры: ккал при недосыпе vs норме, голод при недосыпе vs норме

**Страница 3 — Блок 2: Калорийность и КБЖУ**

- Бар-чарт ккал/день + линия скользящего среднего 7 дней
- Stacked bar: Б/Ж/У по дням
- Пи чарт: распределение по типам приёмов (завтрак/обед/ужин/перекус)
- Цифры: ср. ккал будни/выходные, с активностью/без, Топ-5 дней

**Страница 4 — Блок 3: Перерывы между приёмами**

- Scatter-чарт: перерывы > 5 ч по дням
- Линейный: первый/последний приём по дням (окно питания)
- Бар-чарт: длительность окна по дням (красный = > 5 ч, синий = норма)
- Цифры: ср. окно питания, дней с ужином после 21:00

**Страница 5 — Блок 4: Голод и насыщение**

- Линейный: голод до / насыщение после по дням
- Гистограмма: распределение оценок голода и насыщения (0–10)
- Цифры: перееданий (насыщение ≥8), «Зелёная зона» %

**Страница 6 — Блок 5: Активность и шаги**

- Бар-чарт: шаги по дням + горизонтальная линия-цель 10 000
- Цифры: ср. шагов/день, дней с активностью

**Страница 7 — Блок 6: Дополнительные метрики**

- Чаще пропускается тип приёма
- Топ контекстов (дома/на работе/в машине и т.)
- Спарк-лайн воды по дням

**Последняя страница — Таблица по дням** (как сейчас, без изменений)

### UX-22b.3 Файлы для изменения

- `server/analytics-pdf.ts` — добавить генерацию графиков через `chartjs-node-canvas`
- `server/analytics.ts` — вытащить логику блоков (блок 1–6) в отдельные функции для повторного использования в PDF
- `Dockerfile.api` — добавить `libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg-dev libgif-dev` в apt-get
- `package.json` — добавить `chartjs-node-canvas`, `chart.js`

### UX-22b.4 Цвета графиков

| График             | Цвет                               |
| ------------------ | ---------------------------------- |
| Сон (подъём)       | зелёный `#16a34a`                  |
| Сон (отбой)        | фиолетовый `#7C3AED`               |
| Ккал/день (бары)   | серый `#9ca3af`                    |
| Скольз. среднее 7д | оранжевый `#f59e0b`                |
| Ккал (линия)       | чёрный `#111827`                   |
| Белки              | `#16a34a`                          |
| Жиры               | `#f59e0b`                          |
| Углеводы           | `#3b82f6`                          |
| Голод до           | `#f59e0b`                          |
| Насыщение после    | `#16a34a`                          |
| Шаги               | `#38bdf8`                          |
| Перерыв > 5ч       | красный `#ef4444`, норма `#3b82f6` |

### UX-22b.5 Оценка нагрузки на сервер

Одна страница PDF с графиками: ~80–150ms на график (chartjs-node-canvas). Для периода 7 дней — весь PDF до 2 с. Запрос до 90 дней до 5–10 с (timeout в nginx нужно проверить, если мальше 60 с — расширить).

### Тесты

- Integration: `GET /api/report/analytics-pdf` возвращает `Content-Type: application/pdf`, размер > 50KB
- Визуальная проверка: открыть PDF и убедиться, что все 6 блоков отображаются с графиками

---

## E2E Тест-кейсы — Сквозное тестирование после деплоя на сервере

> **Статус:** 📋 Запланировано (Фаза 30)
> **Приоритет:** Высокий
> **Окружение:** `https://fooddiary.razbudimir.com` (production)
> **Стек проверки:** ручное тестирование + Playwright (авт.)

Сквозные тест-кейсы проверяют работу всего стека в продакшене: nginx → Docker → Express → SQLite → DeepSeek API. Каждый кейс содержит предусловие, шаги и ожидаемый результат.

---

### TC-01 — Регистрация нового пользователя

**Предусловие:** пользователь с логином не существует  
**Шаги:**

1. Открыть `https://fooddiary.razbudimir.com`
2. Нажать «Регистрация», ввести логин + пароль ≥ 8 символов
3. Подтвердить

**Ожидаемый результат:**

- Редирект на главную страницу дневника
- Кнопка «Выйти» видна в навигации
- В DB появилась запись в таблице `users`

---

### TC-02 — Вход и выход

**Предусловие:** пользователь зарегистрирован  
**Шаги:**

1. Ввести логин + пароль → «Войти»
2. Убедиться, что открылась страница дневника
3. Нажать «Выйти»

**Ожидаемый результат:**

- После входа: `Set-Cookie: refreshToken` в заголовках (httpOnly)
- После выхода: редирект на `/auth`, куки очищены
- Повторный переход на `/` без логина → редирект на `/auth`

---

### TC-03 — Добавление приёма пищи

**Предусловие:** пользователь вошёл  
**Шаги:**

1. На главной выбрать дату = сегодня
2. Нажать «Добавить приём», заполнить: еда «Гречка 200г», напитки «Чай», голод 5, сытость 8
3. Нажать «Сохранить»

**Ожидаемый результат:**

- Карточка приёма появляется в списке за сегодня
- Запись сохранена в DB (`meal_entries`)
- Нет ошибки 5xx в консоли

---

### TC-04 — Расчёт КБЖУ через DeepSeek

**Предусловие:** в дневнике есть ≥ 1 запись за сегодня без КБЖУ  
**Шаги:**

1. Нажать «Рассчитать КБЖУ по всему дню» (UX-12)
2. Дождаться ответа (до 15 сек)

**Ожидаемый результат:**

- Каждая карточка показывает ккал / Б / Ж / У
- Итого за день обновилось
- Лог сервера: `DeepSeek API response OK`
- Нет ошибок `429` (токен-лимит) или `5xx`

---

### TC-05 — Редактирование приёма (bottom sheet, моб.)

**Предусловие:** ≥ 1 запись за сегодня, экран ≤ 768px (или DevTools mobile)  
**Шаги:**

1. Нажать на карточку приёма
2. В открывшемся bottom sheet изменить текст еды
3. Сохранить

**Ожидаемый результат:**

- Bottom sheet закрывается
- Карточка обновилась с новым текстом
- Изменение сохранено в DB

---

### TC-06 — Скачивание Excel-отчёта

**Предусловие:** пользователь вошёл, есть записи за сегодня  
**Шаги:**

1. Перейти на страницу «Отчёт»
2. Выбрать «За сегодня», нажать «Скачать Excel»

**Ожидаемый результат:**

- Браузер предлагает скачать `.xlsx`
- Файл открывается, содержит записи дня
- КБЖУ колонки заполнены (если расчёт делался)

---

### TC-07 — Загрузка фото (S3 VK Object Storage)

**Предусловие:** пользователь вошёл, S3 env vars настроены  
**Шаги:**

1. При добавлении приёма прикрепить фото (≤ 5 МБ, JPEG)
2. Сохранить

**Ожидаемый результат:**

- Фото отображается в карточке приёма
- URL фото — из домена VK Object Storage
- EXIF-данные удалены (проверить ExifTool)

---

### TC-08 — Кабинет врача (просмотр пациентов)

**Предусловие:** учётная запись с ролью `doctor` создана  
**Шаги:**

1. Войти как врач
2. Открыть список пациентов, выбрать пациента
3. Просмотреть дневник за последнюю неделю

**Ожидаемый результат:**

- Список дневных записей пациента доступен
- Врач не может редактировать записи пациента
- Доступна кнопка скачать отчёт за период

---

### TC-09 — Аудит-лог (Phase 24)

**Предусловие:** пользователь с ролью `admin` вошёл  
**Шаги:**

1. Перейти в «Аудит» / Admin panel
2. Проверить наличие событий: вход, добавление записи, скачивание отчёта

**Ожидаемый результат:**

- Таблица событий содержит записи с полями: дата/время, пользователь, действие, IP
- Записи соответствуют действиям TC-01–TC-06

---

### TC-10 — Версия приложения (UX-13)

**Шаги:**

1. Открыть приложение на ПК → посмотреть футер
2. Открыть на мобильном → перейти в «О приложении»
3. Нажать кнопку копирования версии

**Ожидаемый результат:**

- Десктоп: версия `v2.11.0` видна в правом углу футера, не переносится
- Мобайл: карточка версии в «О приложении», текст `v2.11.0`
- Буфер обмена содержит строку версии (иконка становится галочкой на 2с)
- Версия читаема в dark mode

---

### TC-11 — /api/health и метрики

**Шаги:**

```bash
curl https://fooddiary.razbudimir.com/api/health
curl https://fooddiary.razbudimir.com/metrics
```

**Ожидаемый результат:**

- `/api/health` → `{"status":"ok", "uptime": ..., "db": "ok"}`
- `/metrics` → Prometheus-формат, содержит `http_request_duration_ms`

---

### TC-12 — CSRF-защита

**Шаги:**

1. Получить CSRF-токен через `GET /api/csrf-token`
2. Сделать POST `/api/meals` без CSRF-заголовка
3. Сделать тот же POST с корректным заголовком `x-csrf-token`

**Ожидаемый результат:**

- Без токена: `403 Forbidden`
- С токеном: `201 Created`

---

### TC-13 — Refresh token ротация

**Шаги:**

1. Войти → получить access token (30 мин)
2. Дождаться истечения access token (или вручную испортить)
3. Выполнить любой API-запрос

**Ожидаемый результат:**

- Приложение автоматически обновляет access token через refresh token
- Пользователь не выброшен на страницу логина
- После 7 дней без активности — выброс на `/auth`

---

### TC-14 — Preflight check скрипт

**Шаги:**

```bash
bash preflight-check.sh
```

**Ожидаемый результат:**

- Все проверки прошли: Docker, nginx, SSL, порты, .env
- Скрипт достукивается до `https://hub.docker.com/` (проверка интернета)
- Выход с кодом 0

---

### Матрица тест-кейсов

| ID    | Сценарий                             | Тип        | Авт. | Приоритет   |
| ----- | ------------------------------------ | ---------- | ---- | ----------- |
| TC-01 | Регистрация нового пользователя      | Ручной     | ❌   | Критический |
| TC-02 | Вход и выход                         | Ручной/Авт | ✅   | Критический |
| TC-03 | Добавление приёма пищи               | Ручной/Авт | ✅   | Критический |
| TC-04 | Расчёт КБЖУ через DeepSeek           | Ручной     | ❌   | Высокий     |
| TC-05 | Редактирование приёма (bottom sheet) | Ручной/Авт | ✅   | Высокий     |
| TC-06 | Скачивание Excel-отчёта              | Ручной     | ❌   | Высокий     |
| TC-07 | Загрузка фото (S3)                   | Ручной     | ❌   | Средний     |
| TC-08 | Кабинет врача                        | Ручной     | ❌   | Высокий     |
| TC-09 | Аудит-лог (Phase 24)                 | Ручной     | ❌   | Средний     |
| TC-10 | Версия приложения (UX-13)            | Ручной/Авт | ✅   | Низкий      |
| TC-11 | /api/health и /metrics               | Авт.       | ✅   | Высокий     |
| TC-12 | CSRF-защита                          | Авт.       | ✅   | Высокий     |
| TC-13 | Refresh token ротация                | Ручной     | ❌   | Высокий     |
| TC-14 | Preflight check скрипт               | Авт.       | ✅   | Критический |

> **Авт.** = тест-кейс реализуется через Playwright в рамках Фазы 30 (Тестирование).

---

## Фаза 21 — Расширенные отчёты Excel

> **Статус:** ✅ Реализовано (v2.22.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Зависимость:** exceljs уже используется в проекте

### 21.1 Выбор периода отчёта

- На странице отчётов — три режима:

  | Режим                      | Описание                                                         |
  | -------------------------- | ---------------------------------------------------------------- |
  | **За день**                | Один конкретный день (date-picker, по умолчанию сегодня)         |
  | **За текущую неделю**      | Пн–Вс текущей недели (или пн–сегодня если неделя не закончилась) |
  | **За произвольный период** | date range picker: `start_date` – `end_date` (макс. 90 дней)     |

- Кнопка «Скачать Excel» / «Скачать PDF» генерирует отчёт выбранного типа

### 21.2 Структура отчёта за неделю / период

- **Лист 1 — Сводка периода:**
  - Итого за период: калории, Б/Ж/У/вода/сон (сумма + среднее в день)
  - Сравнение с нормой (из профиля или плана врача)
  - Топ-5 продуктов по частоте
  - Топ-5 продуктов по калорийности

- **Лист 2+ — По дням (один лист = один день):**
  - Название листа: дата `2026-06-28 (Вс)`
  - Структура как у существующего дневного отчёта
  - Внизу каждого листа — комментарии врача к записям за этот день (если есть, Фаза 15)

- **Лист «Графики»** (опционально, Фаза 21.3):
  - Встроенный LineChart калорий по дням периода
  - Stacked bar Б/Ж/У по дням

### 21.3 Технические детали

```
GET /api/report/excel?mode=day&date=2026-06-28
GET /api/report/excel?mode=week&date=2026-06-28
GET /api/report/excel?mode=range&start=2026-06-01&end=2026-06-28
GET /api/report/pdf?mode=range&start=...&end=...
```

- Генерация на сервере (exceljs), стриминг как `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Лимит: не более 90 дней за один запрос
- Имя файла: `food-diary-2026-06-01_2026-06-28.xlsx`

---

## Фаза 22 — AI с доступом к базе продуктов

> **Статус:** 📋 Запланировано
> **Приоритет:** Средний
> **Сложность:** Высокая

### 22.1 FatSecret API интеграция

- Подключить [FatSecret Platform API](https://platform.fatsecret.com/) для поиска продуктов по названию
- Режимы использования:
  - **При вводе блюда вручную** — автодополнение / подсказка с КБЖУ из базы FatSecret
  - **В DeepSeek-промпте** — если AI не уверен в КБЖУ блюда, делает lookup в FatSecret перед ответом
- OAuth 2.0 (Client Credentials) — ключи в `.env`: `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`
- Кеширование результатов поиска в SQLite (таблица `food_cache`): `name_normalized, kcal, protein, fat, carbs, source, fetched_at`
- TTL кеша: 30 дней

### 22.2 Поиск продуктов в UI

- Поле ввода названия блюда — при паузе 500мс показывает дропдаун с предложениями из FatSecret
- Пользователь выбирает → КБЖУ подставляются автоматически (можно скорректировать)
- Если продукт не найден — пользователь вводит вручную, DeepSeek анализирует

### 22.3 Обогащённый промпт DeepSeek

- Новый flow при анализе блюда:
  1. Попытка найти точное название в FatSecret (русский + транслит)
  2. Если найдено — передать в DeepSeek как reference: «По базе FatSecret: 100г = X ккал, Б/Ж/У»
  3. DeepSeek уточняет с учётом порции и способа приготовления
- Фолбэк: если FatSecret недоступен или не нашёл — только DeepSeek (текущее поведение)

### 22.4 Ограничения и риски

- FatSecret API бесплатный план: 5000 запросов/день — достаточно для небольшой аудитории
- Данные в FatSecret преимущественно на английском — нужна нормализация/транслитерация запроса
- Русские продукты (гречка, квас, борщ) могут отсутствовать → фолбэк на DeepSeek
- Хранить кеш — снижает нагрузку на API и latency

---

## Фаза 23 — Фото питания в S3 (VK Object Storage)

> **Статус:** ✅ Реализовано (v2.9.0)
> **Приоритет:** Средний
> **Сложность:** Высокая
> **Инфраструктура:** VK Object Storage (S3-совместимый), бакет предоставляется отдельно

### 23.1 Архитектура хранения

**Принцип:** S3 хранит файлы неструктурировано, приложение обеспечивает изоляцию через именование ключей и серверную авторизацию.

```
Структура ключей в бакете:
  photos/{user_id}/{year}/{month}/{uuid}.webp

Пример:
  photos/42/2026/06/3f2a1b9c-....webp
  photos/42/2026/06/7d8e4f1a-....webp
  photos/17/2026/06/a1b2c3d4-....webp
```

- Пользователь **никогда не получает прямой URL к S3** — только через серверный прокси
- Бакет **приватный** (ACL: private), публичный доступ заблокирован полностью
- Приложение обращается к S3 через AWS SDK (`@aws-sdk/client-s3`) с server-side credentials

### 23.2 Безопасность — ключевые решения

| Угроза                                    | Защита                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Пользователь A читает фото пользователя B | Сервер проверяет `user_id` из JWT перед выдачей фото                   |
| Угадывание UUID ключей                    | UUID v4 непредсказуем; бакет приватный                                 |
| Перебор ключей через S3 API               | S3 credentials только на сервере, ListBucket отключён для app-роли     |
| IDOR через photo_id                       | `photos` таблица содержит `user_id`, запрос JOIN-ится по `req.user.id` |
| Загрузка вредоносного файла               | Валидация MIME (только `image/*`), ре-энкодинг в WebP через `sharp`    |
| Утечка credentials S3                     | Ключи только в `.env`, в docker через env_file, не логируются          |
| Хранение PII в именах файлов              | Имена файлов — только UUID, без имён пользователей                     |

### 23.3 Серверный прокси для фото

```
POST /api/photos/upload        — загрузка фото (multipart/form-data)
GET  /api/photos/:photo_id     — получить фото (сервер проксирует из S3)
DELETE /api/photos/:photo_id   — удалить фото (сервер удаляет из S3 + БД)
GET  /api/meals/:id/photos     — список фото к записи питания
```

**Нет прямых presigned URL для чтения** — все запросы через сервер с проверкой JWT.  
_(Presigned URL для загрузки — опционально, только PUT, ограниченный по времени 5 минут)_

### 23.4 БД и привязка к записям

```sql
photos (
  id          TEXT PRIMARY KEY,   -- UUID
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_id     INTEGER REFERENCES meals(id) ON DELETE SET NULL,
  s3_key      TEXT NOT NULL,      -- photos/{user_id}/...
  size_bytes  INTEGER,
  created_at  TEXT NOT NULL
)
```

- Фото можно прикрепить к конкретному приёму пищи (meal_id) или оставить без привязки
- При удалении пользователя (Фаза 16) — каскадное удаление фото из БД + фоновая задача удаления из S3

### 23.5 Конфигурация `.env`

```
VK_S3_ENDPOINT=https://hb.vkcs.cloud
VK_S3_REGION=ru-msk
VK_S3_BUCKET=food-diary-photos
VK_S3_ACCESS_KEY=...
VK_S3_SECRET_KEY=...
PHOTO_MAX_SIZE_MB=10
PHOTO_MAX_PER_USER=500
```

### 23.6 UI

- Кнопка «Прикрепить фото» на карточке записи питания
- Превью загруженных фото (thumbnail 200×200) под записью
- При клике — полноразмерное фото в модальном окне
- На мобильном — возможность снять фото через камеру (input accept="image/\*" capture)

## Фаза 25 — GigaChat как второй AI-анализатор КБЖУ

> **Статус:** 📋 Запланировано
> **Приоритет:** Высокий
> **Сложность:** Средняя

### Зачем

DeepSeek — единственный AI-бэкенд для анализа КБЖУ. При недоступности API или исчерпании лимита пользователь теряет функционал. GigaChat от Сбера — российский LLM с собственным API, что снижает зависимость от иностранных сервисов и соответствует требованиям 152-ФЗ о локализации данных.

### 25.1 Исследование GigaChat API

- Изучить [документацию GigaChat API](https://developers.sber.ru/portal/products/gigachat) (Сбер Developer Portal)
- Понять схему авторизации: OAuth 2.0 (`/oauth/token` с `client_credentials`), scope `GIGACHAT_API_PERS` или `GIGACHAT_API_B2B`
- Разобраться с форматом запроса: REST `/chat/completions` (совместим с OpenAI Chat API)
- Особенности: самоподписанный TLS-сертификат Сбера — нужен `NODE_EXTRA_CA_CERTS` или `rejectUnauthorized: false` (только для GigaChat endpoint)
- Лимиты бесплатного плана и стоимость токенов
- Получить `GIGACHAT_CLIENT_ID` и `GIGACHAT_CLIENT_SECRET` через кабинет разработчика

### 25.2 Архитектура dual-AI

```
.env:
  AI_PROVIDER=deepseek          # 'deepseek' | 'gigachat' | 'auto'
  GIGACHAT_CLIENT_ID=...
  GIGACHAT_CLIENT_SECRET=...
  GIGACHAT_SCOPE=GIGACHAT_API_PERS
```

- Новый модуль `server/gigachat.ts` — клиент с авто-обновлением OAuth токена (TTL ~30 мин)
- Абстракция `server/ai.ts` — единая функция `analyzeKBJU(text, profile)` которая роутит вызов в зависимости от `AI_PROVIDER`:
  - `deepseek` — текущее поведение
  - `gigachat` — новый клиент
  - `auto` — пробует DeepSeek, при ошибке/лимите автоматически переключается на GigaChat
- Все роуты `/api/analyze` используют `ai.ts`, не вызывают DeepSeek напрямую

### 25.3 Промпт-адаптация

- GigaChat лучше понимает русский язык нативно — убрать из промпта `Отвечай строго на русском`
- Формат ответа тот же: JSON `{ calories, protein, fat, carbs }` — добавить в промпт явный пример
- Проверить, поддерживает ли GigaChat `response_format: { type: "json_object" }` (как OpenAI) — если нет, парсить через regex fallback

### 25.4 UI и Admin Panel

- В AdminPage добавить блок «AI Provider»:
  - Текущий активный провайдер
  - Переключатель DeepSeek / GigaChat / Auto
  - Статус доступности каждого провайдера (ping)
- В логах usage — колонка `provider` (`deepseek` / `gigachat`) для отслеживания

### 25.5 Конфигурация `.env.example`

```bash
# AI Provider
AI_PROVIDER=auto                        # deepseek | gigachat | auto
GIGACHAT_CLIENT_ID=<client_id>
GIGACHAT_CLIENT_SECRET=<client_secret>
GIGACHAT_SCOPE=GIGACHAT_API_PERS       # GIGACHAT_API_PERS | GIGACHAT_API_B2B
```

---

## Фаза 24 — Аудит-лог действий (Admin & Doctor Audit Log)

> **Статус:** 📋 Запланировано

### Зачем

Администраторы и врачи совершают действия, затрагивающие данные пользователей (смена роли, просмотр дневника, привязка пациента, отправка уведомлений, сброс пароля). Для соответствия 152-ФЗ и внутренней безопасности необходим неизменяемый журнал этих событий с указанием кто, что, когда и над чьими данными.

### 24.1 Таблица `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   INTEGER NOT NULL,          -- кто совершил действие (admin/doctor)
  actor_role TEXT NOT NULL,             -- роль на момент действия
  action     TEXT NOT NULL,             -- тип события (enum ниже)
  target_id  INTEGER,                   -- id затронутого пользователя (если применимо)
  detail     TEXT,                      -- JSON с дополнительными параметрами
  ip         TEXT,                      -- IP источника запроса
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target  ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
```

### 24.2 Типы событий (action enum)

**Административные:**

- `admin.set_role` — смена роли пользователя (`detail: { from, to, targetUsername }`)
- `admin.reset_password` — сброс пароля
- `admin.revoke_sessions` — отзыв refresh-сессий пользователя
- `admin.delete_user` — удаление аккаунта
- `admin.view_user` — просмотр данных пользователя

**Врачебные:**

- `doctor.view_diary` — просмотр дневника пациента (`detail: { patientId, date }`)
- `doctor.assign_patient` — привязка пациента
- `doctor.remove_patient` — открепление пациента
- `doctor.create_plan` — создание КБЖУ-плана (`detail: { planId, kcal, protein, fat, carbs }`)
- `doctor.delete_plan` — удаление плана
- `doctor.add_meal_note` — аннотация приёма пищи
- `doctor.send_notification` — отправка Web Push уведомления (`detail: { sent }`)

### 24.3 Серверная реализация

- `storage.addAuditLog(data)` — запись в журнал (вызывается из routes синхронно, не блокирует ответ)
- `storage.getAuditLog({ actorId?, targetId?, action?, from?, to?, limit? })` — выборка с фильтрами
- Middleware-хелпер `auditLog(req, action, targetId?, detail?)` для удобного логирования в route-хендлерах
- Журнал **append-only** — записи не обновляются и не удаляются через API

### 24.4 API

| Метод | Путь                    | Доступ | Описание                                                             |
| ----- | ----------------------- | ------ | -------------------------------------------------------------------- |
| `GET` | `/api/admin/audit-log`  | admin  | Полный журнал с фильтрами `?actor=&target=&action=&from=&to=&limit=` |
| `GET` | `/api/doctor/audit-log` | doctor | Только собственные действия врача                                    |

### 24.5 Отображение в AdminPage

- Новая вкладка «Журнал» в AdminPage
- Таблица: дата/время · актор · роль · действие · цель · IP · детали (раскрываемые)
- Фильтры: по типу действия, по пользователю, по дате
- Экспорт в CSV

### 24.6 Отображение в DoctorPage

- Вкладка «История» в DoctorPage — только собственные действия текущего врача
- Последние 50 событий, простая таблица без фильтров

### Технические заметки

- Логирование не должно прерывать основной запрос — оборачивать в `try/catch` без re-throw
- IP берётся из `req.ip` (уже настроен `TRUST_PROXY=1`)
- `detail` — произвольный JSON, сериализуется как строка
- Не хранить чувствительные данные в `detail` (пароли, токены, персональные данные сверх ID)
- Для соответствия 152-ФЗ: хранить минимум 1 год, предусмотреть ротацию/архивирование старых записей

---

## Фаза 26 — Tech Debt Sprint: Срочные исправления (из аудита)

> **Статус:** ✅ Реализовано (v2.20.0)
> **Приоритет:** Критический
> **Сложность:** Средняя
> **Источник:** Аудит проекта от 29.06.2026
> **Зависимость:** Выполнить до добавления новых фич

### Описание

Семь критических пробелов, обнаруженных в ходе аудита. Блокируют надёжное масштабирование и создают риски безопасности / потери данных в продакшене.

### Подзадачи

#### 26.1 Versioned migrations через drizzle-kit

- Сгенерировать baseline через `drizzle-kit generate` от текущей схемы
- Закоммитить папку `migrations/` с SQL-файлами
- Заменить сырые `ALTER TABLE ... ADD COLUMN` в `storage.ts` (строки 257–341) на вызов `drizzle-kit migrate` при старте
- Добавить в `docker-compose` стадию `migrate` перед `start`

#### 26.2 Убрать `as any` из routes.ts

- Строки 537, 718: заменить `(userProfile as any)?.dietaryRestrictions` на типизированный доступ
- Добавить недостающие поля (`dietaryRestrictions` и др.) в Zod-схему `shared/schema.ts`
- CI typecheck должен это поймать — проверить конфигурацию

#### 26.3 Скрыть версию nginx / проверить CORS

- Добавить `server_tokens off;` в `nginx.conf`
- Проверить и зафиксировать `Access-Control-Allow-Origin` в allow-list (не `*`)
- Убедиться, что заголовок `Server` не раскрывает версию в ответах

#### 26.4 Autocomplete атрибуты в AuthPage

- Поле имени пользователя: `name="username"`, `autoComplete="username"`
- Поле пароля: `name="password"`, `autoComplete="current-password"` (вход) / `new-password` (регистрация)
- Проверить поведение с менеджерами паролей браузера

#### 26.5 Placeholder в русском UI

- `your_username` → `ваш_логин` или `имя_пользователя`
- Пройтись по всем `placeholder` в `AuthPage.tsx` и устранить англоязычные технические строки

#### 26.6 Toggle «Показать пароль»

- Добавить иконку-кнопку (eye / eye-off из lucide-react) в поля пароля
- Переключает `type="password"` ↔ `type="text"`

#### 26.7 Идемпотентность POST /api/meals

- Добавить поддержку заголовка `Idempotency-Key` на бэкенде
- Хранить ключи в SQLite (таблица `idempotency_keys`, TTL 24ч) и возвращать кэшированный ответ при повторе
- На фронте генерировать `crypto.randomUUID()` при открытии формы нового приёма

---

## Фаза 27 — Наблюдаемость (Observability)

> **Статус:** ✅ Реализовано (v2.20.0)
> **Приоритет:** Критический
> **Сложность:** Средняя
> **Источник:** Аудит: «Наблюдаемость — 2/10»
> **Зависимость:** Фаза 26

### Описание

Текущее состояние — только `console.log`. Без структурированных логов и error tracking продакшен-инциденты становятся невидимыми.

### Подзадачи

#### 27.1 Структурированные логи (pino)

- Установить `pino` + `pino-pretty` (dev)
- Заменить все `console.log/error` в `server/` на `logger.info/error/warn`
- Добавить `request_id` middleware (nanoid) — прокидывать через `AsyncLocalStorage` во все логи запроса
- JSON-формат в продакшене, человекочитаемый в dev

#### 27.2 /api/health с реальными проверками

- Текущий `/api/now` проверяет только время MSK
- Новый `/api/health` проверяет: БД (SELECT 1), S3 (HEAD bucket), DeepSeek API (доступность endpoint)
- Возвращает `{ status: "ok"|"degraded"|"error", checks: { db, s3, ai } }`
- Используется в docker-compose healthcheck

#### 27.3 Sentry (или GlitchTip self-hosted)

- Установить `@sentry/node` + `@sentry/react`
- Настроить DSN через `.env`
- Перехватывать необработанные ошибки Express + React Error Boundaries
- Альтернатива без SaaS: GlitchTip в docker-compose (совместим с Sentry SDK)

#### 27.4 /metrics для Prometheus

- Установить `prom-client`
- Экспортировать: `http_requests_total`, `http_request_duration_ms`, `db_query_duration_ms`, `deepseek_api_calls_total`
- Подключить к существующему Prometheus в инфраструктуре
- Добавить Grafana dashboard для Food Diary

#### 27.5 Prod error handler без утечки стека

- В `index.ts` строка 132: разделить dev и prod режим
- Prod: `{ error: "Internal error", requestId: "..." }` без `err.message`
- Dev: полный стек
- Добавить correlation по `request_id` для поиска в логах

---

## BUG-01 — Отчёт за неделю / произвольный период: ошибка «День не найден»

> **Статус:** ✅ Исправлено (v2.20.0)
> **Приоритет:** Высокий
> **Воспроизводилось:** при нажатии «Скачать за неделю» или «Скачать за период» в дневнике
> **Версия обнаружения:** v2.17.0
> **Версия исправления:** v2.20.0

### Симптом

При скачивании отчёта за неделю или произвольный период пользователь видит ошибку **«День не найден»** вместо файла.

### Корневая причина

**Конфликт маршрутов Express.** В `server/routes/reports.ts` маршруты зарегистрированы в неверном порядке:

```ts
// ❌ Текущий порядок:
app.get("/api/report/:date", ...)   // регистрируется ПЕРВЫМ
app.get("/api/report/range", ...)   // регистрируется вторым — НИКОГДА не достигается
```

Когда клиент запрашивает `/api/report/range?from=...&to=...`, Express сопоставляет первый маршрут — `:date = "range"`. Затем `storage.getDayByDate(userId, "range")` возвращает `null` → ответ `404 { error: "День не найден" }`.

Маршрут `/api/report/range` фактически **недостижим** при текущем порядке регистрации.

### Исправление

Переставить маршруты: статический маршрут `/range` должен быть зарегистрирован **до** параметрического `/:date`.

```ts
// ✅ Правильный порядок:
app.get("/api/report/range", ...)   // статический — ПЕРВЫМ
app.get("/api/report/:date", ...)   // параметрический — вторым
```

### Затронутые функции

- «Скачать за неделю» (`DiaryPage.tsx → downloadWeekReport`)
- «Скачать за период» (`DiaryPage.tsx → downloadRangeReport`)
- `GET /api/report/range?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Тесты для добавления

- `GET /api/report/range` возвращает 200 с валидными датами и существующими записями
- `GET /api/report/range` возвращает 404 с `{ error: "За указанный период записей нет" }` при отсутствии данных
- `GET /api/report/:date` после фикса всё ещё работает для одиночного дня

---

## BUG-02 — Счётчик воды не учитывает напитки из поля «Что пил»

> **Статус:** ✅ Исправлено (v2.21.0)
> **Приоритет:** Средний
> **Воспроизводилось:** всегда, когда пользователь вводит жидкость в поле «Что пил», не используя счётчик порций воды
> **Версия обнаружения:** v2.17.0
> **Версия исправления:** v2.21.0

### Симптом

Счётчик воды (виджет дня, статусная строка, аналитика) учитывает **только** поле `waterUnits` (количество порций по 0,5 л). Если пользователь вписал напиток в поле `drinkText` (например «500 мл сока», «0.3 л чай», «стакан воды»), этот объём **не попадает** в итоговый показатель воды.

### Затронутые места

| Место                             | Текущая логика                                             |
| --------------------------------- | ---------------------------------------------------------- |
| `DiaryPage.tsx` (строки 243, 352) | `meals.reduce((s, m) => s + (m.waterUnits ?? 0) * 0.5, 0)` |
| `DaySummary.tsx` (строка 15)      | то же                                                      |
| `server/excel.ts` (строка 34)     | `totalWater`: `waterUnits * 0.5`                           |
| `server/storage.ts` (строка 863)  | `waterLitres: waterUnits * 0.5`                            |
| `MealCard.tsx` (строка 241)       | показывает только `(waterUnits * 0.5) л`                   |

### Причина

`waterUnits` — специализированное поле для «стаканов/порций чистой воды» (1 ед. = 0,5 л). `drinkText` — свободный текст (может содержать «200 мл кофе», «0.5л компот», «чай» и т.д.). Сейчас парсинг объёма из `drinkText` не выполняется вообще.

### Предлагаемое решение

#### Вариант А — Парсинг объёма из `drinkText` на сервере (рекомендуется)

Добавить утилиту `parseLiquidMl(text: string): number | null`, которая извлекает объём из свободного текста:

```ts
// Примеры распознаваемых паттернов:
// "500 мл сока"  → 500
// "0.5 л чай"    → 500
// "стакан воды"  → 200 (эвристика)
// "2 стакана"    → 400
// "кружка кофе"  → 250 (эвристика)
// "чай"          → null (не распознано)
```

Результат суммируется с `waterUnits * 500` мл → итоговый `waterMl` записывается / пересчитывается при сохранении приёма.

Новое поле `water_ml` в таблице `meals` уже существует (`server/storage.ts:220`) — его нужно заполнять и использовать.

#### Вариант Б — Только UX: предупреждение пользователю

Если `drinkText` заполнен, но `waterUnits = 0` — показывать подсказку: «Укажите количество воды/напитков в порциях, чтобы они учитывались в счётчике».

Менее точно, но нулевая сложность реализации.

### Затронутые функции

- Виджет «Сегодня» — кольцо воды
- Статусная строка дня — `{water} л`
- Аналитика — график воды по дням
- Excel-отчёт — колонка «Вода, л»
- GoalCard — прогресс воды по плану врача

### Тесты для добавления

- `parseLiquidMl("500 мл сока")` → `500`
- `parseLiquidMl("0.5л чай")` → `500`
- `parseLiquidMl("2 стакана")` → `400`
- `parseLiquidMl("кофе")` → `null`
- Суммарная вода за день учитывает и `waterUnits`, и разобранный `drinkText`

---

## Фаза 28 — Безопасность: Второй уровень

> **Статус:** ✅ Реализовано (v2.16.0)
> **Приоритет:** Высокий
> **Сложность:** Высокая
> **Источник:** Аудит: «Безопасность — 7/10»
> **Зависимость:** Фаза 26, Фаза 27

### Описание

Базовые механизмы (bcrypt, JWT, AES-256-GCM) реализованы. Второй уровень — CSRF, MFA для привилегированных ролей, EXIF-strip, антивирус загружаемых файлов.

### Подзадачи

#### 28.1 CSRF-токен

- Установить `csrf` или реализовать double-submit cookie паттерн
- Добавить middleware на все мутирующие роуты (POST/PUT/DELETE)
- На фронте: получать CSRF-токен при `/api/session` и прокидывать в заголовок `X-CSRF-Token`

#### 28.2 MFA (TOTP) для doctor и admin

- Установить `otpauth` или `speakeasy`
- При включении MFA: генерировать TOTP-секрет, показывать QR-код, требовать подтверждение
- Хранить зашифрованный секрет в `secret_store` (уже есть AES-256-GCM)
- При логине для ролей doctor/admin: второй шаг ввода кода если MFA включён

#### 28.3 EXIF strip из загружаемых фото

- При обработке через `sharp` добавить `.rotate()` без аргументов (auto-orientation) + убрать metadata
- Аналог: `sharp(buffer).rotate().toBuffer()` + `withMetadata(false)`
- Проверить, что геолокация пациента не уходит в S3

#### 28.4 Antivirus для загружаемых файлов (ClamAV)

- Добавить сервис `clamav` в `docker-compose.yml`
- После загрузки фото и до сохранения в S3 — сканировать через ClamAV Unix socket
- При обнаружении вируса: удалить файл, вернуть 422, записать в audit log

#### 28.5 Reset-password URL: hash → path

- Текущий: `/#/reset-password?token=...` — токен виден в истории браузера
- Изменить на `/reset-password?token=...` с серверным роутингом SPA
- Обновить nginx.conf: `try_files $uri /index.html` для этого пути

#### 28.6 KDF для ENCRYPTION_KEY

- Текущий: SHA-256 от строки — плохая энтропия при коротком ключе
- Заменить на `scrypt` или `argon2` с зафиксированной солью в `.env`
- Документировать в `.env.example` минимальную длину ключа (32 hex chars)

---

## Фаза 29 — Рефакторинг: Расщепление монолитов

> **Статус:** 🚧 Частично (Wave 3 skeleton v2.12 + finish v2.26.0)
> **Приоритет:** Высокий
> **Сложность:** Высокая
> **Источник:** Аудит: «Архитектура — 6/10»
> **Зависимость:** Фаза 27 (логи нужны до рефакторинга, чтобы ничего не потерять)

### Описание

Wave 3 (v2.12) разнесла `routes.ts` / `schema` / заготовки `repositories/`. К v2.26.0 добавлены: `server/db.ts`, реальный `MealRepository` (не pass-through), `ApiError`, унификация `config` (TTL + photo limits), MSK `mskNowTime` в `shared/dates`, фикс soft-delete в analytics SQL, auth-фото в MealForm, снятие duplicate `cookieParser`.

Остаётся: убрать bootstrap DDL из storage (BUG-03) когда миграции покрывают cold start; внедрить ApiError в route handlers; UI Doctor/Catalog/Profile split.

### Подзадачи

#### 29.1 Расщепление server/routes.ts

- ✅ Разнести по доменам: `server/routes/auth.ts`, `meals.ts`, `doctor.ts`, `admin.ts`, `photos.ts`, `reports.ts`, `catalog.ts`
- 🚧 Единый `server/routes/index.ts` — register\* (не nested Router mounts)
- ✅ Общая типизация ошибок: `ApiError { code, message, details? }` (`server/errors.ts`)
- 📋 Adoption: handlers ещё не `throw ApiError` (middleware готов)

#### 29.2 Расщепление server/storage.ts

- 🚧 `server/repositories/` + **`server/db.ts`** (shared connection)
- ✅ Real SQL: Meal / Day / Session / Catalog / Photo / Audit / **User** / **Doctor** (v2.27) — storage делегирует
- 🚧 `storage.ts` — facade + analytics SQL + bootstrap DDL (документировано в `migrate.ts`)
- ✅ Split AdminPage → `components/admin/*`; AnalyticsPage → `components/analytics/*`
- ✅ MealFields unify MealForm + MealEditSheet

#### 29.5 Магические числа → config.ts

- ✅ `server/config.ts`: TTL, rate limits, page size, **PHOTO*MAX*\***
- ✅ `auth.ts` / `s3.ts` читают config

#### 29.6 Единая MSK-логика

- ✅ `mskToday` / `mskNowTime` в `shared/dates.ts`; storage re-export
- 📋 bot/utils/dates.py

---

## Фаза 30 — Тестирование: Расширение покрытия

> **Статус:** ✅ Реализовано (v2.13.0)
> **Приоритет:** Высокий
> **Сложность:** Высокая
> **Источник:** Аудит: «покрытие ~921 строка на ~10 000+ строк кода»
> **Зависимость:** Фаза 29 (компоненты легче тестировать по отдельности)

### Описание

Текущее покрытие ~9% по строкам. CI уже есть, но порог покрытия не задан — можно сломать логику и не узнать.

### Результат (v2.13.0)

- 99 тестов: 26 integration + 73 unit
- Coverage 40.1% lines — порог 40% записан в `vitest.config.ts`, CI шаг обновлён на `--coverage`
- `server/__mocks__/deepseek.ts` — мок DeepSeek API без реальных вызовов
- E2E: TC-02 (login/logout), TC-03 (add meal), TC-05 (edit), TC-11 (health)
- Исправлен баг: `migrations/0000_baseline.sql` содержал `pd_consent_at`, который migration 0003 добавлял повторно

---

## Фаза 35 — Тестирование: Следующий шаг (после v2.13.0)

> **Статус:** ✅ Реализовано (v2.14.0): 242 теста, coverage 56.8%, threshold 55%
> **Приоритет:** Высокий
> **Сложность:** Средняя

### Анализ текущих пробелов

По данным v2.13.0 coverage, основные зоны с нулевым/низким покрытием:

| Файл                       | Lines% | Что не покрыто                                                                                              |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `server/repositories/*`    | 0%     | Все 9 репозиториев (user, meal, day, session, doctor, catalog, photo, audit, session) — нет ни одного теста |
| `server/routes/doctor.ts`  | 14%    | 13 эндпойнтов: привязка пациентов, планы, заметки к приёмам                                                 |
| `server/routes/reports.ts` | 6%     | Excel-экспорт дневника — полностью без тестов                                                               |
| `server/routes/catalog.ts` | 20%    | CRUD пищевого каталога                                                                                      |
| `server/routes/photos.ts`  | 8%     | S3 upload, EXIF strip, MIME-валидация                                                                       |
| `server/deepseek.ts`       | 11%    | КБЖУ-анализ: запросы, парсинг, лимиты                                                                       |
| `server/storage.ts`        | 44%    | ~50% методов SqliteStorage не проверяются                                                                   |
| `server/mail.ts`           | 12%    | SMTP-отправка — нет тестов с моком                                                                          |
| `server/csrf.ts`           | 43%    | Double-submit cookie — половина ветвей не проверяется                                                       |

### Подзадачи

#### 35.1 Тесты repositories (0% → 60%+)

Хранилище вынесено в `server/repositories/` в Wave 3 — теперь у него 0% покрытия. Каждый репозиторий — тонкая SQL-логика, которая заслуживает прямых unit-тестов с in-memory SQLite:

- `user.ts`: createUser, getUserById, updateLastLogin, bootstrapAdmin
- `meal.ts`: createMeal, getMealsByDay, deleteMeal
- `session.ts`: createRefreshToken, revokeToken, pruneExpired
- `day.ts`: getOrCreateDay, updateSummary
- `doctor.ts`: assignPatient, unassignPatient, getPatients

#### 35.2 Тесты doctor-routes (14% → 60%+)

Доктор-роуты — самый большой непокрытый блок (13 эндпойнтов). Нужны интеграционные тесты `test/integration/doctor-routes.test.ts`:

- Регистрация + назначение роли doctor
- Привязка/отвязка пациента
- Чтение дневника пациента, добавление заметок
- Создание/удаление планов питания
- Запрет просмотра чужого пациента

#### 35.3 Тесты catalog + reports (0-20% → 50%+)

- `catalog-routes.test.ts`: CRUD позиций каталога, save-from-meal, изоляция по пользователю
- `reports-routes.test.ts`: проверка структуры Excel-отчёта (Content-Type, filename header, наличие листов)
- Мок `server/__mocks__/excel.ts` для обхода тяжёлой библиотеки ExcelJS

#### 35.4 Мок для mail.ts + csrf.ts

- `server/__mocks__/mail.ts`: перехват nodemailer/SMTP — письма сохраняются в память, не отправляются
- Тест `forgot-password` с моком SMTP: проверка тела письма, срока токена, idempotency
- Unit-тесты `csrf.ts`: double-submit cookie, X-CSRF-Token header, whitelist маршрутов

#### 35.5 Повышение порога coverage

- Цель: 40% (v2.13.0) → **55%** (v2.14.0)
- Обновить `vitest.config.ts`: `thresholds.lines: 55`
- Дополнительно: `thresholds.functions: 50` — функции сейчас 39%

#### 35.6 Инфраструктура тестов

- Отдельный `vitest.config.integration.ts` для интеграционных тестов (они медленно, ~12с, чтобы не сползать unit-проход при разработке)
- `npm run test:unit` vs `npm run test:integration` в `package.json`
- Snapshot-тесты для OpenAPI-спецификации (ломается при добавлении роутов без обновления дока)
- `test/fixtures/` — фикстуры: набор тестовых пользователей, приёмов, дней для повторного использования в тестах

#### 35.7 E2E: дополнительные сценарии

- TC-06 — Доктор привязывает пациента и читает его дневник
- TC-08 — Аналитика: range-отчёт за период (диапазон дат, наличие данных)
- TC-09 — Excel-экспорт: загрузка файла, проверка MIME-типа ответа
- TC-12 — Сброс пароля: форма запроса, получение письма (с мок СМТП), сам reset-flow

### Результат (v2.14.0)

| Показатель          | До    | После                                                                          |
| ------------------- | ----- | ------------------------------------------------------------------------------ |
| Тестовых файлов     | 14    | 16 (+2 интегр.)                                                                |
| Тестов              | 207   | 242 (+35)                                                                      |
| Coverage lines      | 50.4% | 56.8%                                                                          |
| Threshold           | 40%   | 55%                                                                            |
| Новых файлов тестов | —     | repositories, doctor-routes, catalog-routes, mail, csrf, deepseek, user-routes |

---

## Фаза 31 — Продуктовые улучшения: UX-полировка (из аудита)

> **Статус:** ✅ Реализовано (v2.15.0)
> **Приоритет:** Высокий
> **Сложность:** Средняя
> **Источник:** Аудит: «UX/UI — 4/10»
> **Зависимость:** Фаза 26 (базовые фиксы)

### Описание

Продуктовые UX-улучшения, выявленные при аудите живого сайта: undo удаления, валидация в реальном времени, skeleton loaders, empty states, доступность.

### Подзадачи

#### 31.1 Undo после удаления приёма пищи

- Toast «Приём удалён» с кнопкой «Отменить» (5 секунд)
- Soft-delete: помечать запись `deleted_at` вместо физического удаления
- При отмене: снять `deleted_at`, вернуть в список

#### 31.2 Soft-delete с окном 30 дней

- Поле `deleted_at TIMESTAMP` в таблице `meals`
- Физическое удаление — cron-задача раз в сутки (старше 30 дней)
- Для 152-ФЗ: зафиксировать в политике конфиденциальности срок 30 дней

#### 31.3 Skeleton loaders

- Заменить `isLoading ? null : content` на `<Skeleton />` из shadcn/ui
- Охватить: DiaryPage (список дней), AnalyticsPage, DoctorPage (список пациентов)

#### 31.4 Empty states

- DiaryPage без записей за день: «Добавьте первый приём питания»
- DoctorPage без пациентов: «Привяжите первого пациента, нажав +»
- CatalogPage без продуктов: «Ваш каталог пуст — добавьте продукты из дневника»

#### 31.5 Клиентская валидация форм в реальном времени

- `react-hook-form` + `zod` уже в зависимостях — подключить resolver
- AuthPage: валидация длины логина/пароля, совпадение паролей при регистрации, индикатор силы пароля
- Ошибки показываются под полем сразу при blur, а не после submit

#### 31.6 Доступность (Accessibility)

- Добавить `aria-label` ко всем иконочным кнопкам в `BottomNav` и карточках приёмов
- Увеличить tap target slider для порций до минимум 44px
- Добавить `axe-core` в CI (`@axe-core/playwright` в e2e)
- Пройтись по контрасту кнопки «Войти» через `axe`

#### 31.7 Тёмная тема

- `next-themes` + CSS-переменные shadcn уже поддерживают тёмную тему из коробки
- Добавить переключатель в ProfilePage и в шапке десктопной версии
- Зафиксировать выбор в `localStorage`

---

## Фаза 32 — Продуктовые фичи: Новые возможности (из аудита)

> **Статус:** 📋 Запланировано
> **Приоритет:** Средний
> **Сложность:** Высокая
> **Источник:** Аудит: раздел «Что добавить → Продуктовое»

### Описание

Новые продуктовые функции для роста и дифференциации: лендинг, weight tracking, шаблоны питания, share-ссылка, PDF-экспорт, email-дайджест.

### Подзадачи

#### 32.1 Маркетинговый лендинг

- Переместить форму входа на `/login`, корень `/` — лендинг
- Лендинг: заголовок, блок «как это работает в 3 шага», скриншоты, кнопка «Начать»
- Ссылка врача пациенту работает без объяснений

#### 32.2 Weight tracking timeseries

- Профиль уже хранит вес — превратить в timeseries (таблица `weight_entries`)
- График изменения веса на AnalyticsPage
- Врач видит динамику веса пациента в кабинете

#### 32.3 Шаблоны планов питания для врачей

- Врач создаёт именованный шаблон (набор рекомендованных продуктов/норм)
- Назначает шаблон пациенту
- Пациент видит рекомендации рядом с фактическим дневником

#### 32.4 Read-only share-link для врача

- Врач генерирует одноразовый токен на просмотр дневника пациента за день
- Ссылка `/share/{token}` — доступна без логина, истекает через 24ч
- Пациент видит выданные ссылки и может их отозвать

#### 32.5 PDF-экспорт рядом с Excel

- Генерация PDF из того же шаблона через `puppeteer` или `@react-pdf/renderer`
- Кнопка «Скачать PDF» рядом с «Скачать Excel» в разделе отчётов

#### 32.6 Weekly digest на email

- Пациент получает еженедельный дайджест (пн, 09:00) с итоговым КБЖУ за неделю
- Врач получает сводку по всем пациентам
- Email через SMTP (nodemailer) или Postmark

#### 32.7 GigaChat Vision: фото → КБЖУ

- GigaChat Vision принимает изображение блюда и возвращает КБЖУ
- Интегрировать рядом с DeepSeek: если загружено фото — использовать Vision
- Конкурентное преимущество: пользователь фотографирует тарелку, а не описывает текстом

---

## Фаза 33 — Инфраструктура: DR и Производительность

> **Статус:** 📋 Запланировано
> **Приоритет:** Средний
> **Сложность:** Средняя
> **Источник:** Аудит: «Нет фазы DR/RTO, нет триггеров миграции на Postgres»

### Подзадачи

#### 33.1 Off-site backup в VK Object Storage

- Бэкап SQLite (`data/food_diary.db`) и S3-фото — уже есть скрипт
- Загружать зашифрованный архив в отдельный VK Object Storage bucket (`food-diary-backups`)
- Расписание: ежедневно в 03:00 MSK через cron в docker-compose

#### 33.2 Restore-тест в staging

- Ежемесячная процедура: поднять staging-контейнер, восстановить последний backup, проверить `/api/health`
- Документировать RTO (цель: < 30 минут) и RPO (цель: < 24 часа)
- Зафиксировать процедуру в `docs/runbooks/restore.md`

#### 33.3 Триггеры миграции на PostgreSQL

- Задокументировать пороги: >1000 пользователей ИЛИ >10GB БД ИЛИ >100 RPS — рассмотреть Postgres
- `server/db.ts` должен абстрагировать диалект (Drizzle поддерживает Postgres без смены кода)
- Нагрузочное тестирование через `k6` при достижении 500 пользователей

#### 33.4 Telegram-бот: завершить или удалить

- `bot/bot.py` обращается к несуществующим роутам `/api/tg/...`
- Решение: либо реализовать роуты + flow привязки через deep-link токен из веб-кабинета (фаза 0 оригинального роадмапа), либо удалить `bot/` из репозитория до готовности и вынести в отдельный репо

---

## Фаза 34 — API и Документация

> **Статус:** ✅ Реализовано (v2.23.0)
> **Приоритет:** Средний
> **Сложность:** Низкая
> **Источник:** Аудит: «API без документации»

### Подзадачи

#### 34.1 OpenAPI спека из Zod

- Установить `@asteasolutions/zod-to-openapi`
- Аннотировать существующие Zod-схемы метаданными OpenAPI
- Сгенерировать `openapi.yaml` и опубликовать на `/api/docs` (Swagger UI)

#### 34.2 ADR (Architectural Decision Records)

- Создать папку `docs/adr/`
- Зафиксировать ключевые решения: почему SQLite, почему bcryptjs а не argon2, почему wouter а не react-router, почему monorepo без turborepo
- Шаблон: `docs/adr/template.md` по формату MADR

#### 34.3 Обновить README

- README описывает V1 — обновить до V2: список всех реализованных фич, скриншоты, инструкция по деплою
- Добавить бейджи: CI status, покрытие тестов, версия

---

## Фаза 35 — Интеграции с Health-платформами

> **Статус:** 📋 Запланировано
> **Приоритет:** Низкий
> **Сложность:** Высокая
> **Источник:** Аудит: «Долгосрочное — интеграции»

### Подзадачи

#### 35.1 Apple Health (HealthKit)

- Доступно только через нативное приложение (требует iOS/WKWebView)
- Передача данных: вес, шаги, калории за день
- Зависимость: Фаза 12 (iOS PWA/нативная обёртка)

#### 35.2 Google Fit / Health Connect

- REST API доступен из веба через OAuth2
- Синхронизация: вес, активность
- Не требует нативного приложения

#### 35.3 Mi Band / Xiaomi Health

- Неофициальный API через `python-miband` — ненадёжно
- Рассмотреть Health Connect как единую точку для Android-носимых

## Таблица приоритетов фаз

| Фаза  | Название                                            | Приоритет   | Сложность | Статус                                                                                                |
| ----- | --------------------------------------------------- | ----------- | --------- | ----------------------------------------------------------------------------------------------------- |
| 0     | Заготовки под Telegram-бот                          | Низкий      | Низкая    | 📋 Запланировано                                                                                      |
| 1     | Качество кода                                       | Высокий     | Средняя   | ✅ Реализовано в v1.5.0                                                                               |
| 2     | Безопасность и аудит                                | Высокий     | Средняя   | ✅ Реализовано в v1.5.0                                                                               |
| 3     | Персистентность данных                              | Критический | Низкая    | ✅ Реализовано в v1.4.0                                                                               |
| 4     | Административная панель                             | Средний     | Высокая   | ✅ MVP реализовано v1.10.0                                                                            |
| 5     | Самостоятельный сброс пароля                        | Низкий      | Средняя   | ✅ Реализовано в v1.15.0                                                                              |
| 6     | HTTPS и домен                                       | Критический | Низкая    | ✅ Реализовано в v1.4.0                                                                               |
| 7     | WAF и инфраструктура                                | Средний     | Средняя   | 📋 Запланировано (отложена)                                                                           |
| 8     | Масштабируемость и микросервисы                     | Низкий      | Высокая   | 📋 Запланировано                                                                                      |
| 9     | Алертинг DeepSeek в админке                         | Средний     | Средняя   | ✅ Реализовано v1.11.0                                                                                |
| 10    | Управление временем жизни сессий                    | Высокий     | Средняя   | ✅ Реализовано в v1.5.0                                                                               |
| 11    | Аналитика и графики истории питания                 | Средний     | Высокая   | ✅ Реализовано v1.16.0                                                                                |
| 14    | Мобильная оптимизация веб-приложения                | **Высокий** | Низкая    | 📋 Запланировано (ПЕРЕД 12/13)                                                                        |
| 12    | Android APK (Android 10+)                           | Средний     | Высокая   | 📋 Запланировано                                                                                      |
| 13    | Публикация в RuStore                                | Средний     | Средняя   | 📋 Запланировано                                                                                      |
| 15    | Кабинет врача                                       | Высокий     | Высокая   | ✅ Реализовано (v2.9.0)                                                                               |
| 16    | 152-ФЗ Compliance                                   | Высокий     | Средняя   | 📋 Запланировано                                                                                      |
| 17    | Анкета пользователя (User Profile)                  | Высокий     | Средняя   | 📋 Запланировано                                                                                      |
| 18    | Таргет КБЖУ от врача                                | Средний     | Средняя   | ✅ Реализовано (v2.9.0)                                                                               |
| 19    | AI-советник по питанию                              | Средний     | Средняя   | 📋 Запланировано                                                                                      |
| 20    | Профиль питания и ограничения                       | Средний     | Низкая    | ✅ Реализовано (v2.9.0)                                                                               |
| UX-6  | День недели в карусели дат                          | Высокий     | Низкая    | 📋 Запланировано                                                                                      |
| UX-7  | Каталог еды пользователя                            | Высокий     | Средняя   | ✅ Реализовано (v2.9.0)                                                                               |
| UX-8  | Автовысота комментария дня в отчёте                 | Высокий     | Низкая    | 📋 Запланировано                                                                                      |
| UX-9  | Футер / Legal-разделы (desktop+mobile)              | Высокий     | Низкая    | 📋 Запланировано                                                                                      |
| UX-10 | Редактирование приёма — bottom sheet (моб.)         | Высокий     | Средняя   | ✅ Реализовано (v2.11.0)                                                                              |
| UX-11 | Добавление позиции из дневника в каталог            | Высокий     | Средняя   | ✅ Реализовано (v2.8.0)                                                                               |
| UX-12 | «Рассчитать КБЖУ по всему дню»                      | Высокий     | Низкая    | ✅ Реализовано (v2.11.0)                                                                              |
| UX-13 | Версия приложения в футере / «О приложении»         | Средний     | Низкая    | ✅ Реализовано (v2.11.0)                                                                              |
| UX-14 | Дата нового приёма = выбранный день                 | Высокий     | Низкая    | ✅ Реализовано (v2.18.0)                                                                              |
| UX-15 | Форма добавления приёма вверху страницы             | Высокий     | Средняя   | ✅ Реализовано (v2.18.0)                                                                              |
| UX-16 | Фото в форме создания приёма                        | Высокий     | Низкая    | ✅ Реализовано (v2.18.0)                                                                              |
| UX-17 | Мультифото: до 5 фото на приём + компактные превью  | Средний     | Средняя   | 📋 Запланировано                                                                                      |
| UX-18 | AI Vision: расчёт КБЖУ по фото (DeepSeek/GigaChat)  | Высокий     | Высокая   | 📋 Запланировано                                                                                      |
| UX-19 | Фото на карточках приёма + миниатюры/ссылки в Excel | Высокий     | Средняя   | 📋 Запланировано                                                                                      |
| UX-20 | Ручной приоритет КБЖУ в анкете (не перезаписывать)  | Высокий     | Низкая    | 📋 Запланировано                                                                                      |
| 21    | Расширенные отчёты Excel                            | Высокий     | Средняя   | 📋 Запланировано                                                                                      |
| 22    | AI + FatSecret база продуктов                       | Средний     | Высокая   | 📋 Запланировано                                                                                      |
| 23    | Фото питания в S3 (VK Object Storage)               | Средний     | Высокая   | ✅ Реализовано (v2.9.0)                                                                               |
| 24    | Аудит-лог действий (Admin & Doctor)                 | Высокий     | Средняя   | ✅ Реализовано (v2.11.0)                                                                              |
| 25    | GigaChat (Сбер) — второй AI-помощник                | Средний     | Высокая   | 📋 Запланировано                                                                                      |
| 26    | Tech Debt Sprint: срочные исправления               | Критический | Средняя   | ✅ Реализовано (v2.10.0)                                                                              |
| 27    | Наблюдаемость (pino, Sentry, /health, metrics)      | Критический | Средняя   | ✅ Реализовано (v2.10.0)                                                                              |
| 28    | Безопасность: CSRF, MFA, EXIF, ClamAV               | Высокий     | Высокая   | ✅ Реализовано (v2.11.0+v2.16.0): CSRF+EXIF+reset-pw+scrypt (v2.11/v2.16), MFA TOTP+ClamAV (v2.16.0)  |
| 29    | Рефакторинг: расщепление монолитов                  | Высокий     | Высокая   | 🚧 Частично (v2.12 skeleton + v2.26.0 MealRepo/db/ApiError)                                           |
| 30    | Тестирование: расширение покрытия                   | Высокий     | Высокая   | ✅ Реализовано (v2.13.0): 99 тестов, coverage 40.1%, DeepSeek mock, E2E TC-02/03/05/11                |
| 31    | UX-полировка: undo, skeleton, a11y, dark            | Высокий     | Средняя   | ✅ Реализовано (v2.15.0): soft-delete + undo, skeletons, zod валидация, aria-labels, dark mode toggle |
| 32    | Продуктовые фичи: лендинг, PDF, digest              | Средний     | Высокая   | 📋 Запланировано                                                                                      |
| 33    | DR и производительность: backup, k6, Postgres       | Средний     | Средняя   | 📋 Запланировано                                                                                      |
| 34    | API-документация: OpenAPI, ADR, README v2           | Средний     | Низкая    | 📋 Запланировано                                                                                      |
| 35    | Тестирование: расширение покрытия v2                | Высокий     | Высокая   | ✅ Реализовано (v2.14.0): 242 теста, coverage 56.8%, threshold 55%                                    |
| UX-1  | Редактирование приёма пищи                          | Высокий     | Низкая    | ✅ Реализовано в v1.6.0                                                                               |
| UX-2  | Логин пользователя в админке                        | Высокий     | Низкая    | ✅ Реализовано в v1.13.0                                                                              |
| UX-3  | Перенос приёма между днями                          | Высокий     | Средняя   | ✅ Реализовано в v1.13.0                                                                              |
| UX-4  | Явные даты подъёма и отбоя                          | Высокий     | Средняя   | ✅ Реализовано в v1.13.0                                                                              |
| UX-5  | Календарные периоды аналитики                       | Средний     | Средняя   | ✅ Реализовано в v1.13.0                                                                              |

**Легенда приоритетов:**

- **Критический** — блокирует продакшен-эксплуатацию
- **Высокий** — необходимо для стабильной работы
- **Средний** — важно, но не блокирует запуск
- **Низкий** — долгосрочные улучшения

---

**Рекомендуемый порядок реализации:** Фаза 6 → Фаза 3 → Фаза 10 → Фаза 2 → Фаза 1 → UX-1 → Фаза 4 → Фаза 9 → Фаза 11 → UX-2 → UX-3 → UX-4 → UX-5 → Фаза 7 → Фаза 5 → Фаза 0 → **Фаза 16 → Фаза 17 → UX-6 → UX-8 → Фаза 20 → UX-7 → Фаза 21 → Фаза 15 → Фаза 18 → Фаза 19 → Фаза 22 → Фаза 23** → Фаза 12 → Фаза 13 → Фаза 8

**Следующий шаг после v2.7.0:** Фаза 16 (152-ФЗ Compliance) → Фаза 17 (Анкета пользователя) → UX-6 (день недели) → Фаза 20 (Профиль питания) → UX-7 (Каталог еды) → Фаза 21 (Расширенные отчёты) → Фаза 15 (Кабинет врача) → Фаза 18/19 (КБЖУ-таргет + AI-советник) → Фаза 22 (FatSecret) → Фаза 23 (S3 фото). Мобильные приложения (12/13) — финальный этап.

---

## BUG-03 — Рассинхрон \_\_drizzle_migrations при деплое на существующую БД

> **Статус:** ✅ Исправлено вручную (v2.21.0, деплой 2026-07-05)
> **Приоритет:** Критический
> **Воспроизводилось:** при деплое v2.21.0 на prod-сервер с БД от v2.17.0
> **Версия обнаружения:** v2.21.0

### Симптом

Контейнер падал в restart loop с ошибкой:

```
DrizzleError: Failed to run the query 'ALTER TABLE `meals` ADD COLUMN `deleted_at` text;'
cause: SqliteError: duplicate column name: deleted_at
```

### Причина

Миграции 0005–0008 были применены на продакшн-БД через **guarded DDL** (ручной `ALTER TABLE` в `server/migrate.ts`), но их хэши **не были записаны** в таблицу `__drizzle_migrations`. При следующем деплое drizzle-kit считал эти миграции непримененными и пытался выполнить повторно.

### Исправление (ручное, разовое)

Вставили хэши миграций 0005–0008 напрямую в БД:

```sql
INSERT INTO __drizzle_migrations (hash, created_at) VALUES
  ('02bac39cfa0a0753cfdc223f667238754b71b06a4fe5c0f0d3def7190cdc66f0', 1782774500000),
  ('44b1f76927bf4a75313c3e8fc34fcf4cbc162a7933bf0c72408278bd2e5ad135', 1782774600000),
  ('09ec310671d29a047ff858c56922ab9b7fb6f520a6751b6f0e463261a657e5b3', 1782774700000),
  ('e9e56137c3ac2f71a65d4c13b2f36745e286c833338cfacfefe87a337bdc0a63', 1783267800000);
```

### Системное решение

В `server/migrate.ts` guarded DDL выполняется **после** `migrate()`, то есть уже применённые вручную DDL не мешают drizzle. Но если в `__drizzle_migrations` нет записи — drizzle попытается применить SQL снова.

**TODO (Фаза 29 / рефакторинг):** заменить guarded DDL в `migrate.ts` на корректные drizzle-kit миграции, чтобы хэши записывались автоматически. Guarded DDL оставить только как аварийный fallback для реально сломанных БД.

---

## BUG-04 — ClamAV сокет недоступен в production

**Проявление:** В логах при каждом health-check и загрузке фото — `[clamav] scan error: connect ENOENT /var/run/clamav/clamd.sock`. Сканирование вирусов не работает, загрузка файлов при этом не блокируется (fail-open).

**Версия обнаружения:** v2.22.1 (2026-07-05)

**Вероятная причина:** Контейнер `food_diary_clamav` запущен, но Unix-сокет `/var/run/clamav/clamd.sock` не пробрасывается в контейнер `api` через volume mount, либо ClamAV внутри контейнера не успевает запуститься до первого scan-запроса.

**Приоритет:** Средний (безопасность — antivirus не работает, но функциональность не нарушена)

**TODO:** Проверить `docker-compose.prod.yml` — volume с сокетом ClamAV должен быть примонтирован в оба контейнера. Добавить health-check для `food_diary_clamav` с `depends_on` в `api`.

---

## BUG-05 — Node.js 20 EOL для AWS SDK после января 2027

**Проявление:** При старте контейнера — `NodeVersionSupportWarning: AWS SDK v3 будет требовать node >=22 после первой недели января 2027`.

**Версия обнаружения:** v2.22.1 (2026-07-05)

**Приоритет:** Низкий (срок — январь 2027, не срочно)

**TODO (до января 2027):** Обновить `Dockerfile.api` с `node:20-slim` на `node:22-slim`. Проверить совместимость всех зависимостей с Node 22 через `npm audit` + тесты.

---

## BUG-06 — idempotency_keys: отсутствуют колонки response_status / response_body

**Проявление:** `POST /api/meals` → 500 `no such column: "response_status"`. Приём пищи не сохраняется.

**Версия обнаружения:** v2.22.1 (2026-07-06)

**Причина:** Таблица `idempotency_keys` на production-сервере была создана более ранней версией кода без колонок `response_status` и `response_body`. Миграция 0002 в Drizzle считалась применённой по hash, поэтому при деплое ALTER TABLE не выполнялся автоматически.

**Решение (применено вручную на сервере 2026-07-06):**

```sql
ALTER TABLE idempotency_keys ADD COLUMN response_status INTEGER NOT NULL DEFAULT 200;
ALTER TABLE idempotency_keys ADD COLUMN response_body TEXT NOT NULL DEFAULT '{}';
```

**Статус:** ✅ Исправлено вручную на production 2026-07-06

**TODO (профилактика):** Рассмотреть добавление startup-проверки схемы критичных таблиц через PRAGMA table_info с алертом в лог при расхождении с ожидаемой схемой.

---

## BUG-08: ClamAV — заблокированный IP / unhealthy контейнер

**Статус:** 📋 Запланировано
**Приоритет:** Низкий
**Дата обнаружения:** 2026-07-20

### Симптомы

- `food_diary_clamav` показывает `unhealthy` в `docker ps`
- FreshClam не может обновить вирусные базы: Cisco/Talos CDN блокирует IP VK Cloud (Amsterdam range)
- Ошибка: `Forbidden; Blocked by CDN`, cf-ray `a1e4b8eabc6d9715-AMS`
- Clamd при этом **запускается и работает** со старыми базами (`Database status OK`)
- На работу API не влияет (код graceful: сокет недоступен → скан пропускается)

### Варианты решения

**Вариант А — зеркало FreshClam**

- Прописать альтернативное зеркало баз в конфиге clamav
- В `docker-compose.prod.yml` добавить env: `FRESHCLAM_DATABASE_MIRROR=database.clamav.net`
- Или использовать unoffical mirror без гео-блокировки

**Вариант Б — убрать ClamAV полностью**

- Удалить сервис из `docker-compose.prod.yml`
- Убрать graceful-вызов из `server/s3.ts`
- Обоснование: приложение личное (1 пользователь), угроза минимальна
- Вернуть при масштабировании на публичный доступ

---

## BUG-09: Из каталога переносится только название, без КБЖУ

**Статус:** 📋 Запланировано
**Приоритет:** Высокий
**Дата обнаружения:** 2026-07-23

### Симптомы

- Пользователь выбирает позицию из каталога (кнопка «Из каталога» в форме нового приёма пищи)
- В поле «Что ел» подставляется только название блюда (например, «Цезарь с курицей ФудКорт ВК Тех»)
- Поля калорий, белков, жиров, углеводов остаются пустыми / нулевыми
- КБЖУ из позиции каталога не переносится в форму

### Ожидаемое поведение

- При выборе из каталога в форму должны подставляться: название + calories/protein/fat/carbs из записи каталога

### Где смотреть

- `client/src/components/diary/MealForm.tsx` — обработчик выбора из каталога
- `client/src/components/catalog/CatalogPicker.tsx` (или аналог) — что именно передаётся обратно
- Убедиться, что `onSelect` callback передаёт полный объект каталога, а не только `name`

---

## v2.24.0 — 2026-07-25

### BUG-fix: DeepSeek модель переименована

- `deepseek-chat` → `deepseek-v4-flash` (Cisco устарел с 2026-07-24)
- Файл: `server/deepseek.ts`

### Клиентский лог ошибок (AdminPage → таб «Ошибки»)

- Migration 0009: таблица `client_errors` (retention 7 дней)
- `POST /api/client-errors` — публичный endpoint (rate limit 20/мин), пишет ошибку в БД
- `GET /api/client-errors/admin` — только для admin
- `client/src/lib/errorReporter.ts` — throttle-отправка ошибок
- `client/src/components/ErrorBoundary.tsx` — React ErrorBoundary с отправкой
- `client/src/main.tsx` — `window.onerror` + `window.onunhandledrejection`
- `AdminPage.tsx` — новый таб «Ошибки» с таблицей и авто-refresh раз в минуту

---

## v2.24.1 — 2026-07-25 (hotfix)

### HOTFIX: deepseek-v4-flash возвращает thinking mode

- `deepseek-v4-flash` при стандартном запросе включает `<think>...</think>` блоки
- Regex `\{[\s\S]*\}` захватывал JSON внутри think-блока (мог быть промежуточный JSON, не финальный)
- **Исправления в `server/deepseek.ts`:**
  1. Добавлен стриппинг `<think>...</think>` блоков перед парсингом
  2. Добавлен `response_format: { type: "json_object" }` — API принудительно отдаёт JSON без markdown и thinking
  3. Улучшена логика fallback-парсинга (non-greedy regex loop)
  4. Логирование raw content при ошибке парсинга (`console.error`)
- `max_tokens`: 300 → 400 (запас для JSON ответа в v4-flash)

---

## v2.24.2 — 2026-07-25 (hotfix)

### HOTFIX: deepseek-v4-flash не отдавал JSON — второй подход

- Добавлена `system` роль с жёстким требованием JSON-only ответа
- Убран `response_format: json_object` (не поддерживается стабильно)
- Промпт переведён на английский для надёжного следования инструкции
- Добавлен диагностический endpoint `POST /api/admin/deepseek-raw-test`
- Обновлены тесты: `messages[0]` = system, `messages[1]` = user

---

## v2.24.3 — 2026-07-25 (bugfix)

### BUG-09: Перенос КБЖУ из каталога в приём пищи

- **Причина:** `onSelect` в `MealForm.tsx` заполнял `form.calories/protein/fat/carbs`, но payload при сохранении брал КБЖУ только из `kbjuResult` (результат кнопки "Рассчитать"). `kbjuResult` оставался `null` → КБЖУ не сохранялось.
- **Фикс:** при выборе из каталога с ненулевым КБЖУ вызывается `setKbjuResult(...)` — КБЖУ попадает в payload сохранения и отображается в UI-блоке результата.
- Файл: `client/src/components/diary/MealForm.tsx`

---

## Pending: S3 Admin расширения

### UX-S3-1: Статистика объектов в бакете

- Endpoint `GET /api/admin/s3-stats` — кол-во объектов в бакете, разбивка по пользователям (userId из ключа `photos/{userId}/...`)
- В AdminPage: новая секция "S3 статистика" с таблицей userId → кол-во файлов → суммарный размер

### UX-S3-2: Диагностика загрузки фото

- Текущая кнопка "Проверить S3" тестирует PutObject/GetObject/DeleteObject синтетическим JPEG
- Нужно добавить отдельный тест: реальная загрузка тестового файла и проверка что URL доступен
- Если фото не загружается — разобраться с причиной (ACL, endpoint, CORS, presigned URL vs прямой URL)

---

## v2.24.4 — 2026-07-25

### UX-S3-1: Статистика S3 бакета по пользователям

- `GET /api/admin/s3-stats` — ListObjectsV2 по всему бакету, разбивка по userId из ключей `photos/{userId}/...`
- Обогащение username из БД через `storage.listUsers()`
- AdminPage: новая карточка "S3 статистика бакета" — таблица userId/username/файлов/размер, итого, флаг truncated при >10 000 объектов

### UX-S3-2: Реальный тест загрузки фото

- `POST /api/admin/s3-upload-test` — загружает реальный 1×1 WebP через тот же `uploadPhoto()` pipeline (sharp → PutObject), затем GetObject, DeleteObject
- Показывает время каждого шага и размер файла
- AdminPage: новая карточка "S3 загрузка (реальный тест)"
- Отличие от `/api/admin/s3-test`: использует тот же код что и фото пользователей — выявляет реальные проблемы pipeline

---

## v2.25.0 — 2026-07-27

### DS-FIX: Исправлен расчёт КБЖУ через DeepSeek

- `deepseek.ts`: fallback на `reasoning_content` если `content` пустой (deepseek-v4-flash thinking mode)
- Улучшен парсинг: strip markdown fences как последний resort
- Детальный error log при неожиданном формате

### ADMIN-1: Проверка DeepSeek API в AdminPage

- `GET /api/admin/deepseek-check` — реальный вызов `analyzeNutrition()` с тестовым блюдом
- AdminPage: новая карточка "DeepSeek API — проверка" с временем ответа и результатом

### ADMIN-2: Серверный лог ошибок в Журнале

- Express error middleware в `routes/index.ts` — перехватывает все 4xx/5xx кроме 401/403
- DeepSeek ошибки из `POST /api/analyze` логируются в `client_errors` напрямую
- Теперь в разделе "Журнал ошибок" AdminPage видны серверные ошибки

### MOBILE: Исправлен header на мобилках

- "Кабинет врача" и кнопка "Отчёт" скрыты на мобилке (`hidden sm:flex`)
- В мобильное меню (троеточие) добавлены: Кабинет врача, Отчёт за день, Отчёт за неделю

---

## Pending: Performance + Mobile Photo

### PERF-01: Ускорение расчёта КБЖУ

- Текущая проблема: `deepseek-v4-flash` в thinking mode долго генерирует `<think>` блок перед ответом — пользователь ждёт 5–15 секунд
- Варианты решения:
  1. Переключить на `deepseek-chat` (без thinking mode) — быстрее, но менее точный
  2. Попробовать `deepseek-v3` — нет thinking mode, высокая точность
  3. Streaming endpoint — показывать индикатор прогресса пока думает
  4. Параметр `thinking: { budget_tokens: 0 }` для отключения thinking у v4-flash
- Приоритет: высокий (UX блокер)

### BUG-10: Ошибка загрузки фото с мобильного телефона

- Воспроизводится на мобильном браузере, с ПК не проверялось
- Возможные причины: MIME type (HEIC/HEIF от iPhone), размер файла, Content-Type multipart, CORS
- Нужно: проверить с ПК, собрать HAR/логи с мобилки, добавить конвертацию HEIC → WebP на сервере если нужно
- Приоритет: высокий
