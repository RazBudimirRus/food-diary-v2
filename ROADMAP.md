# 🗺 Food Diary V2 — RoadMap

**Версия:** 2.4.0  
**Дата обновления:** 27 июня 2026  
**Проект:** Food Diary V2 — веб-сервис дневника питания для врачебного наблюдения  
**Стек:** React 18 + Vite · Node.js 20 + Express + TypeScript + SQLite · Docker Compose · bcrypt + JWT + AES-256-GCM · DeepSeek API  
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

| Версия / дата       |             Фаза | Статус         | Что вошло                                                                          |
| ------------------- | ---------------: | -------------- | ---------------------------------------------------------------------------------- |
| v1.0.0 · 2026-06-25 |              MVP | ✅ Реализовано | Веб-форма дневника, SQLite, Excel-отчёт, Docker Compose                            |
| v1.1.0 · 2026-06-25 |        Preflight | ✅ Реализовано | `preflight-check.sh` для проверки готовности сервера                               |
| v1.2.0 · 2026-06-26 |     Auth/secrets | ✅ Реализовано | Регистрация/логин/logout, bcrypt, AES-256-GCM secrets, изоляция userId             |
| v1.3.x · 2026-06-26 | КБЖУ/date-picker | ✅ Реализовано | Date-picker, DeepSeek КБЖУ, колонка КБЖУ в Excel                                   |
| v1.4.0 · 2026-06-26 |       Фазы 6 + 3 | ✅ Реализовано | HTTPS/Caddy, secure cookies/proxy, SQLite WAL, backup scripts                      |
| v1.5.0 · 2026-06-27 |  Фазы 10 + 2 + 1 | ✅ Реализовано | Refresh sessions, idle timeout, Helmet/CORS/rate-limit, IDOR/PATCH fixes, tests/CI |
| v1.6.0 · 2026-06-27 |             UX-1 | ✅ Реализовано | Редактирование приёма пищи через PATCH, обновление Query cache, integration + E2E |
| v1.7.0 · 2026-06-27 | Фаза 4 foundation | 🚧 Частично    | `user/admin` роли, `requireAdmin`, `ADMIN_BOOTSTRAP_USERNAME`, read-only sessions  |
| v1.8.0 · 2026-06-27 |  Фаза 4 sessions | 🚧 Частично    | Admin revoke одной refresh-сессии или всех refresh-сессий пользователя             |
| v1.9.0 · 2026-06-27 |     Фаза 4 reset | 🚧 Частично    | Admin user list + reset password с временным паролем и revoke refresh sessions     |
| v1.10.0 · 2026-06-27 | Фаза 4 usage dashboard | ✅ MVP | `api_usage`, DeepSeek token/cost tracking, dashboard, daily limit status            |
| v1.11.0 · 2026-06-27 |  Фаза 9 limit guard | ✅ Реализовано | Блокировка `/api/analyze` при достижении `DEEPSEEK_DAILY_TOKEN_LIMIT`              |
| v1.12.0 · 2026-06-27 |      Фаза 11 analytics | ✅ MVP | `/api/analytics/summary`, cards, Recharts graphs, calories/БЖУ/water/sleep trends  |
| v1.16.0 · 2026-06-27 | Фаза 11 full analytics | ✅ Реализовано | 6 блоков, insights, 3/6 мес, CSV, sleep debt, gaps, histograms |
| v1.13.0 · 2026-06-27 | UX-2…UX-5 | ✅ Реализовано | Admin username, meal day move, wake/sleep dates, calendar analytics periods |
| v1.15.0 · 2026-06-27 | Фаза 5 password reset | ✅ Реализовано | forgot/reset password by email, SMTP, `/#/reset-password` |

> Прод-сервер может отставать от `main`: после коммитов Phase 10/2/1 нужен отдельный деплой на VPS.

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

## Фаза 12 — Android APK (Android 10+)

### Что делаем

Нативная или гибридная **мобильная сборка** дневника питания для современных Android-устройств (**minSdk 29 / Android 10+**), с полным паритетом ключевых функций веб-версии: авторизация, ввод приёмов, КБЖУ, аналитика, офлайн-толерантность где возможно.

### Требования совместимости

| Параметр | Значение |
| -------- | -------- |
| **minSdkVersion** | 29 (Android 10) |
| **targetSdkVersion** | актуальный stable (35+) |
| **compileSdk** | совпадает с target |
| **ABI** | `arm64-v8a`, `armeabi-v7a` (x86_64 — опционально для эмуляторов) |
| **Ориентация** | portrait + adaptive для планшетов |
| **Разрешения** | только необходимые (INTERNET, при необходимости — уведомления) |

### Стек (рекомендация)

| Вариант | Плюсы | Минусы |
| ------- | ----- | ------ |
| **Capacitor + существующий React/Vite** | Переиспользование UI, быстрый MVP | WebView-ограничения |
| **React Native / Expo** | Нативнее UX | Больше переработки |
| **TWA (Trusted Web Activity)** | Минимум кода, PWA в Chrome | Зависимость от Chrome, ограниченный офлайн |

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

| # | Проверка | Статус |
| - | -------- | ------ |
| 1 | Release APK/AAB подписан production keystore | ☐ |
| 2 | `targetSdk` соответствует требованиям RuStore | ☐ |
| 3 | Нет hardcoded secrets в APK | ☐ |
| 4 | API только HTTPS (`fooddiary.razbudimir.com`) | ☐ |
| 5 | Политика конфиденциальности доступна по URL | ☐ |
| 6 | Тестовый аккаунт для модераторов (login/password в приватном поле консоли) | ☐ |
| 7 | Скриншоты актуального UI | ☐ |
| 8 | `versionCode` больше предыдущей публикации | ☐ |

### Документация

- `docs/RUSTORE.md` — полная инструкция с скриншотами консоли, шаблон описания, FAQ модерации
- Ссылка на RuStore в README после публикации

---

## Таблица приоритетов фаз

| Фаза | Название                            | Приоритет   | Сложность | Статус                  |
| ---- | ----------------------------------- | ----------- | --------- | ----------------------- |
| 0    | Заготовки под Telegram-бот          | Низкий      | Низкая    | 📋 Запланировано        |
| 1    | Качество кода                       | Высокий     | Средняя   | ✅ Реализовано в v1.5.0 |
| 2    | Безопасность и аудит                | Высокий     | Средняя   | ✅ Реализовано в v1.5.0 |
| 3    | Персистентность данных              | Критический | Низкая    | ✅ Реализовано в v1.4.0 |
| 4    | Административная панель             | Средний     | Высокая   | ✅ MVP реализовано v1.10.0 |
| 5    | Самостоятельный сброс пароля        | Низкий      | Средняя   | ✅ Реализовано в v1.15.0 |
| 6    | HTTPS и домен                       | Критический | Низкая    | ✅ Реализовано в v1.4.0 |
| 7    | WAF и инфраструктура                | Средний     | Средняя   | 📋 Запланировано (отложена) |
| 8    | Масштабируемость и микросервисы     | Низкий      | Высокая   | 📋 Запланировано        |
| 9    | Алертинг DeepSeek в админке         | Средний     | Средняя   | ✅ Реализовано v1.11.0  |
| 10   | Управление временем жизни сессий    | Высокий     | Средняя   | ✅ Реализовано в v1.5.0 |
| 11   | Аналитика и графики истории питания | Средний     | Высокая   | ✅ Реализовано v1.16.0  |
| 12   | Android APK (Android 10+)           | Средний     | Высокая   | 📋 Запланировано        |
| 13   | Публикация в RuStore                | Средний     | Средняя   | 📋 Запланировано        |
| UX-1 | Редактирование приёма пищи          | Высокий     | Низкая    | ✅ Реализовано в v1.6.0 |
| UX-2 | Логин пользователя в админке        | Высокий     | Низкая    | ✅ Реализовано в v1.13.0 |
| UX-3 | Перенос приёма между днями          | Высокий     | Средняя   | ✅ Реализовано в v1.13.0 |
| UX-4 | Явные даты подъёма и отбоя          | Высокий     | Средняя   | ✅ Реализовано в v1.13.0 |
| UX-5 | Календарные периоды аналитики       | Средний     | Средняя   | ✅ Реализовано в v1.13.0 |

**Легенда приоритетов:**

- **Критический** — блокирует продакшен-эксплуатацию
- **Высокий** — необходимо для стабильной работы
- **Средний** — важно, но не блокирует запуск
- **Низкий** — долгосрочные улучшения

---

**Рекомендуемый порядок реализации:** Фаза 6 → Фаза 3 → Фаза 10 → Фаза 2 → Фаза 1 → UX-1 → Фаза 4 → Фаза 9 → Фаза 11 → UX-2 → UX-3 → UX-4 → UX-5 → Фаза 7 → Фаза 5 → Фаза 0 → **Фаза 12 → Фаза 13** → Фаза 8

**Следующий шаг после v1.16.0:** Фаза 0 — TG stubs, затем **Фаза 12 (Android APK)** и **Фаза 13 (RuStore)**. Фаза 7 (WAF) отложена.
