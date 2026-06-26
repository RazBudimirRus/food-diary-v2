# Context — Food Diary V2 (PROJECT24_FOODDIARY2)

> **ОБЯЗАТЕЛЬНО ДЛЯ ВСЕХ AI-АГЕНТОВ (Cursor, Perplexity, и др.)**
>
> При **каждом** новом чате, задаче или вопросе по этому проекту:
> 1. **Сначала прочитай этот файл целиком** (`Context.md`).
> 2. Затем при необходимости — `ROADMAP.md` (план фаз) и `README.md` (установка/API).
> 3. После выполнения значимых изменений **обнови раздел «Журнал изменений»** внизу этого файла.
> 4. Не смотри в `.env` (секреты). Используй только `.env.example`.
>
> Путь к проекту: `c:\Users\user\OneDrive\Документы\CURSOR\APPLICATIONS\PROJECT24_FOODDIARY2`

---

## Проект

| Поле | Значение |
|------|----------|
| Название | Food Diary V2 |
| Назначение | Личный дневник питания + Excel-отчёт для врача/нутрициолога |
| GitHub | https://github.com/RazBudimirRus/food-diary-v2 |
| Локальная папка | `APPLICATIONS/PROJECT24_FOODDIARY2` внутри workspace CURSOR |
| Домен (план) | `fooddiary.razbudimir.com` |
| VPS | Ubuntu 24.04, wildcard `*.razbudimir.com` |
| Исходная разработка | **Perplexity MAX** (Computer mode), затем доработки в **Cursor** |

---

## Стек

- **Frontend:** React 18, Vite, Tailwind, shadcn/ui, TanStack Query, wouter (hash routing)
- **Backend:** Node.js 20, Express 5, TypeScript, Drizzle ORM, SQLite (better-sqlite3)
- **Auth:** bcrypt (cost 12), JWT (httpOnly cookie, 7d), AES-256-GCM для secrets
- **AI:** DeepSeek API — расчёт КБЖУ (ключ из env → шифруется в БД, userId=0)
- **Excel:** exceljs — отчёт врача, 8 колонок (включая КБЖУ)
- **Deploy:** Docker Compose (сервис `api`), опционально Caddy
- **Часовой пояс:** МСК (UTC+3), день = 00:00–23:59 MSK

---

## Что уже реализовано (v1.x)

- Веб-форма: приёмы пищи, голод/сытость 0–10, контекст, тип приёма
- Регистрация / логин / logout, изоляция данных по userId
- Date-picker в форме (запись задним числом, max = сегодня MSK)
- DeepSeek КБЖУ: кнопка в форме, бейджи на карточках, колонка H в Excel
- Итоги дня (подъём, отбой, спорт, шаги) — диалог перед первым отчётом
- `preflight-check.sh`, `DEPLOY.md`, двуязычный `README.md`
- `ROADMAP.md` v2.1.0 — 11 фаз (0–10)

---

## Известные проблемы (code review, ещё не исправлены)

| Проблема | Где | Критичность |
|----------|-----|-------------|
| **IDOR** — нет проверки `day.userId` при сохранении итогов дня | `POST /api/days/:id/summary` | Высокая |
| **PATCH /api/meals/:id** без Zod — mass assignment | `server/routes.ts` | Высокая |
| JWT дублируется в JSON ответа + React state (смысл httpOnly частично теряется) | auth flow | Средняя |
| Нет rate-limit, Helmet, CSP, `secure` на cookie | server | Средняя |
| Мёртвый Python-бот `bot/bot.py` вызывает несуществующие `/api/tg/*` | `bot/` | Низкая (legacy) |
| Много неиспользуемых npm-зависимостей (шаблон Replit) | `package.json` | Низкая |
| Дублирование схемы БД: raw SQL + Drizzle + ALTER в runtime | `server/storage.ts` | Средняя |
| README: `DELETE /api/secrets` — эндпоинта нет | docs | Низкая |
| Логи API пишут полный JSON ответа | `server/index.ts` | Средняя |
| **Нет тестов** | — | Средняя |

---

## Структура репозитория (ключевое)

```
PROJECT24_FOODDIARY2/
├── client/src/pages/     # AuthPage.tsx, DiaryPage.tsx (~770 строк)
├── server/               # index.ts, routes.ts, auth.ts, storage.ts, excel.ts, deepseek.ts
├── shared/schema.ts      # Drizzle + Zod схемы
├── bot/                  # Python aiogram — LEGACY, не в docker-compose
├── ROADMAP.md            # План фаз 0–10
├── Context.md            # Этот файл
├── docker-compose.yml    # volume bind → /srv/foodbot/data
└── preflight-check.sh
```

---

## Docker / данные

- `docker-compose.yml`: volume `data_db` → bind mount `/srv/foodbot/data`
- SQLite: в коде `new Database("data.db")` — путь относительно cwd контейнера (см. `Dockerfile.api`, WORKDIR меняется на `/app/data`)
- Перед продакшеном: убедиться, что БД не теряется при `docker compose down` (без `-v`)

---

## История работы (Cursor + Perplexity)

### Perplexity MAX (исходный MVP)
- Собран full-stack из шаблона rest-express / Replit
- Excel под формат врача, веб-форма, позже auth + DeepSeek
- Changelog в README: v1.0 → v1.2 (удаление TG из compose, JWT, secrets)

### Cursor (сессии 2026-06-26)
1. Клонирование в `APPLICATIONS/PROJECT24_FOODDIARY2` (не в корень CURSOR)
2. Code review качества: оценка 6.5/10, список уязвимостей и legacy
3. Несколько `git pull` — в основном docs (`ROADMAP.md`, Phase 10 sessions)
4. Последний известный коммит: `cbd0100` — ROADMAP Phase 10 checklist

### Git (важные коммиты)
- `66baee9` — date-picker + DeepSeek КБЖУ
- `5116974` — ширина колонки H в Excel (28→34)
- `9cb98b8` — ROADMAP v2.0.0
- `8c73960`, `cbd0100` — ROADMAP v2.1.0, Фаза 10 (сессии)

---

## Порядок реализации (из ROADMAP + уточнения)

**Официальный порядок в ROADMAP.md:**
```
6 → 3 → 10 → 2 → 1 → 4 → 9 → 7 → 5 → 0 → 8
```

| Шаг | Фаза | Зачем сейчас |
|-----|------|--------------|
| 1 | **6** HTTPS + Caddy + ufw | Без TLS cookie/медданные в открытую; блокер прода |
| 2 | **3** Volume + backup + WAL | Не потерять SQLite |
| 3 | **10** Access/refresh + idle timeout | После HTTPS (`secure` cookie); медицинские данные |
| 4 | **2** Security (Helmet, rate-limit, IDOR fix) | Закрыть дыры из code review |
| 5 | **1** Тесты + CI | Страховка перед админкой |
| 6 | **4** Админ-панель | Операционка |
| 7 | **9** Алертинг DeepSeek | Зависит от админки |
| 8 | **7** Cloudflare WAF | После HTTPS |
| 9 | **5** Сброс пароля email | Когда появятся внешние пользователи |
| 10 | **0** TG stubs (grammy) | Низкий приоритет |
| 11 | **8** Масштабирование | Только при реальной нагрузке |

**Быстрый hotfix до Фазы 2:** IDOR в `days/:id/summary` + Zod на PATCH meals — можно сделать сразу после Фазы 6.

---

## Рекомендации по выбору модели (вместо Auto)

> **Auto** в Cursor — роутер, удобен для мелочей, но для roadmap-фаз лучше **явно выбирать модель**.

| Тип задачи | Модель в Cursor | Почему |
|------------|-----------------|--------|
| Инфра: Caddy, docker-compose, bash, backup | **Composer** или **GPT-5.3 Codex** | Быстро, хорошо для конфигов и скриптов |
| Security: IDOR, auth, refresh tokens, Helmet | **GPT-5.3 Codex** или **GPT-5.5 Medium** | Меньше ошибок в тонкой логике |
| Фаза 10 (сессии) — полная реализация | **GPT-5.3 Codex** | Чеклист из ROADMAP, много связанных файлов |
| Тесты Vitest + supertest + Playwright + CI | **GPT-5.5 Medium** | Многофайловая настройка |
| Админ-панель + дашборды (Фазы 4, 9) | **GPT-5.5 Medium** | UI + API + схема БД |
| Рефакторинг / чистка зависимостей | **Composer** | Объёмный, но не критичный по безопасности |
| Code review / security audit | **Bugbot** или **Security Review** (subagent) | Специализированный разбор |
| Документация, ROADMAP, Context | **Composer** или **Perplexity** | Perplexity — для исследований и планов |
| Мелкие правки (1 файл, typo, width колонки) | **Composer** / **Gemini Flash** | Дёшево и быстро |

**Perplexity MAX** — оставить для: архитектурных решений, сравнения сервисов (Cloudflare vs VK WAF), черновиков ROADMAP. **Код в репозиторий** — через **Cursor Agent** с явной моделью.

**Не использовать быстрые модели для:** auth, refresh tokens, шифрование, IDOR-fix, CSP.

---

## Правила для агентов

1. Проект лежит в `APPLICATIONS/PROJECT24_FOODDIARY2`, не в корне CURSOR.
2. Не коммитить без явной просьбы пользователя.
3. Не читать `.env`.
4. Минимальный diff — не рефакторить несвязанное.
5. Согласовывать изменения с `ROADMAP.md` и обновлять `Context.md`.
6. Windows: `npm run dev` может требовать `cross-env` для `NODE_ENV`.

---

## Журнал изменений Context.md

| Дата | Кто | Что |
|------|-----|-----|
| 2026-06-26 | Cursor Agent | Создан Context.md: контекст Perplexity+Cursor, code review, roadmap, модели, порядок фаз |

---

*Версия Context.md: 1.0 · Синхронизировать с ROADMAP.md v2.1.0*
