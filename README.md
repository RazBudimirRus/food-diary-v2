<div align="center">

# 🥗 Food Diary V2

**Личный дневник питания** — Telegram-бот + веб-форма с выгрузкой отчёта в формате Excel для врача.

**Personal food diary** — Telegram bot + web form with Excel report export for your doctor.

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![aiogram](https://img.shields.io/badge/aiogram-3.x-2CA5E0?logo=telegram&logoColor=white)](https://aiogram.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

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

Food Diary V2 — инструмент для ведения дневника питания, разработанный для личного контроля и совместной работы с лечащим врачом или нутрициологом. Сервис позволяет фиксировать каждый приём пищи через Telegram-бота или веб-форму, отслеживать уровень голода и насыщения по шкале 0–10, а в конце дня скачивать готовый Excel-отчёт в формате, согласованном с врачом.

> **Версия 1 (текущая):** текстовый ввод. Распознавание по фото (GigaChat Vision) запланировано в V2.

## Возможности

| Функция | Веб-форма | Telegram-бот |
|---|:---:|:---:|
| Добавить приём пищи | ✅ | ✅ |
| Навигация по датам | ✅ | ✅ |
| Шкала голода/насыщения 0–10 | ✅ | ✅ |
| Контекст приёма (где, как) | ✅ | ✅ |
| Итоги дня (подъём/спорт/шаги) | ✅ | ✅ |
| Excel-отчёт для врача | ✅ | ✅ |
| Удаление записи | ✅ | — |
| Распознавание фото | 🔜 V2 | 🔜 V2 |

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
│   ┌──────────────┐              ┌─────────────────────┐     │
│   │  Веб-браузер │              │   Telegram-клиент   │     │
│   └──────┬───────┘              └──────────┬──────────┘     │
└──────────┼───────────────────────────────  ─┼───────────────┘
           │ HTTP/HTTPS                        │ Bot API (polling)
┌──────────▼──────────────────────────────────▼───────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────────────────────┐   ┌─────────────────────┐ │
│  │   api (Node.js / Express)    │   │  bot (Python/       │ │
│  │                              │   │       aiogram 3)    │ │
│  │  • Vite SPA (React 18)       │   │                     │ │
│  │  • REST API (/api/*)         │◄──┤  • FSM диалоги      │ │
│  │  • Excel generator (exceljs) │   │  • /add /today      │ │
│  │  • Drizzle ORM + SQLite      │   │  • /report /summary │ │
│  └──────────────┬───────────────┘   └─────────────────────┘ │
│                 │                                           │
│  ┌──────────────▼───────────────┐                          │
│  │    data.db (SQLite)          │                          │
│  │    /srv/foodbot/data/        │                          │
│  └──────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Стек технологий

| Слой | Технология |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui |
| Backend | Node.js 20, Express, TypeScript |
| База данных | SQLite (better-sqlite3) + Drizzle ORM |
| Telegram-бот | Python 3.12, aiogram 3, FSM (MemoryStorage) |
| Excel | exceljs |
| Контейнеризация | Docker, Docker Compose |
| Reverse proxy | Caddy (опционально) |
| Часовой пояс | МСК (UTC+3) — день = 00:00–23:59 MSK |

## Установка и запуск

### Требования

- Ubuntu 22.04 / 24.04 LTS
- Docker >= 24 + Docker Compose plugin
- Токен Telegram-бота (получить у [@BotFather](https://t.me/BotFather))
- Минимум 1 GB RAM, 5 GB свободного диска

### Шаг 0. Проверка готовности сервера

Перед установкой обязательно запустите скрипт проверки:

```bash
wget -qO preflight-check.sh https://raw.githubusercontent.com/RazBudimirRus/food-diary-v2/main/preflight-check.sh
sudo bash preflight-check.sh
```

Скрипт проверяет 11 параметров (OS, RAM, диск, сеть, Docker, порты, firewall, токен) и выводит цветной отчёт. При наличии типовых проблем запустите с флагом `--fix`:

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

### Шаг 2. Создание рабочей директории

```bash
sudo mkdir -p /srv/foodbot/data
sudo chown -R $USER:$USER /srv/foodbot
```

### Шаг 3. Клонирование репозитория

```bash
cd /srv/foodbot
git clone https://github.com/RazBudimirRus/food-diary-v2.git .
```

### Шаг 4. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Минимальный `.env`:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef-ваш_токен_от_BotFather
API_BASE_URL=http://api:5000
```

### Шаг 5. Запуск

```bash
docker compose up -d --build
```

Проверить статус:
```bash
docker compose ps
docker compose logs -f
```

### Шаг 6. Доступ

| Сервис | Адрес |
|---|---|
| Веб-форма | `http://<IP_сервера>:5000` |
| API | `http://<IP_сервера>:5000/api/now` |
| Telegram-бот | Найти по имени в Telegram, `/start` |

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
cd /srv/foodbot
git pull
docker compose up -d --build
```

### Бэкап базы данных

```bash
# Ручной бэкап
cp /srv/foodbot/data/data.db /backup/data-$(date +%Y%m%d_%H%M%S).db

# Автоматический (cron, ежедневно в 03:00)
echo "0 3 * * * cp /srv/foodbot/data/data.db /backup/data-\$(date +\%Y\%m\%d).db" | crontab -
```

## Использование

### Веб-форма

1. Откройте `http://<сервер>:5000`
2. Навигация по датам — стрелки в шапке (нельзя выбрать дату в будущем)
3. Нажмите **«Добавить приём пищи»** → заполните форму
4. Кнопка **«Отчёт»** в шапке → если итоги дня ещё не заполнены, откроется диалог (подъём/отбой/спорт/шаги). При повторном скачивании диалог не показывается
5. Файл скачивается как `Дневник_питания_YYYY-MM-DD.xlsx`

### Telegram-бот

| Команда | Действие |
|---|---|
| `/start` | Приветствие и список команд |
| `/add` | Добавить приём пищи (пошаговый диалог) |
| `/today` | Показать все записи за сегодня |
| `/report` | Скачать Excel за сегодня |
| `/report 2026-06-25` | Скачать Excel за конкретную дату |
| `/summary` | Заполнить итоги дня (подъём, спорт, шаги) |

> **Важно:** один день = 00:00–23:59 по МСК (UTC+3). Записи всегда относятся к московскому времени независимо от часового пояса устройства.

---

# 🇬🇧 English

## Description

Food Diary V2 is a personal food diary tool designed for self-monitoring and collaboration with a doctor or nutritionist. It lets you log every meal via a Telegram bot or web form, track hunger and satiety on a 0–10 scale, and download a ready-made Excel report at the end of the day in a format agreed with your doctor.

> **Version 1 (current):** text input only. Photo recognition (GigaChat Vision) is planned for V2.

## Features

| Feature | Web Form | Telegram Bot |
|---|:---:|:---:|
| Add meal entry | ✅ | ✅ |
| Date navigation | ✅ | ✅ |
| Hunger/satiety scale 0–10 | ✅ | ✅ |
| Meal context (where, how) | ✅ | ✅ |
| Day summary (wake/sport/steps) | ✅ | ✅ |
| Excel report for doctor | ✅ | ✅ |
| Delete entry | ✅ | — |
| Photo recognition | 🔜 V2 | 🔜 V2 |

### Excel Report

Generated in the doctor's agreed format:
- **7 columns:** time interval, hunger before (0–10), meal type, food, drink, satiety after (0–10), context
- **Day summary:** wake time, bedtime, sport activity, steps, general comment
- **Auto totals:** total water volume, meal count, avg hunger/satiety — with empty "doctor's version" fields
- **Color-coded hunger scale legend** (green zone 3–7, red zone 0–2 and 8–10)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Clients                            │
│   ┌──────────────┐               ┌──────────────────────┐   │
│   │  Web browser │               │   Telegram client    │   │
│   └──────┬───────┘               └──────────┬───────────┘   │
└──────────┼────────────────────────────── ───┼───────────────┘
           │ HTTP/HTTPS                        │ Bot API (polling)
┌──────────▼───────────────────────────────── ▼───────────────┐
│                      Docker Compose                         │
│                                                             │
│  ┌──────────────────────────────┐   ┌─────────────────────┐ │
│  │   api  (Node.js / Express)   │   │  bot  (Python /     │ │
│  │                              │   │        aiogram 3)   │ │
│  │  • Vite SPA (React 18)       │◄──┤  • FSM dialogs      │ │
│  │  • REST API (/api/*)         │   │  • /add /today      │ │
│  │  • Excel generator           │   │  • /report /summary │ │
│  │  • Drizzle ORM + SQLite      │   └─────────────────────┘ │
│  └──────────────┬───────────────┘                           │
│                 │                                           │
│  ┌──────────────▼───────────────┐                          │
│  │   data.db  (SQLite)          │                          │
│  │   /srv/foodbot/data/         │                          │
│  └──────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui |
| Backend | Node.js 20, Express, TypeScript |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Telegram bot | Python 3.12, aiogram 3, FSM (MemoryStorage) |
| Excel | exceljs |
| Containerization | Docker, Docker Compose |
| Reverse proxy | Caddy (optional) |
| Timezone | MSK (UTC+3) — day = 00:00–23:59 MSK |

## Installation & Setup

### Requirements

- Ubuntu 22.04 / 24.04 LTS
- Docker >= 24 + Docker Compose plugin
- Telegram bot token (get one from [@BotFather](https://t.me/BotFather))
- At least 1 GB RAM, 5 GB free disk

### Step 0. Server readiness check

Run the preflight script before installing:

```bash
wget -qO preflight-check.sh https://raw.githubusercontent.com/RazBudimirRus/food-diary-v2/main/preflight-check.sh
sudo bash preflight-check.sh
```

The script checks 11 parameters (OS, RAM, disk, network, Docker, ports, firewall, token) and outputs a color-coded report. For automatic fixing of common issues:

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

### Step 2. Create working directory

```bash
sudo mkdir -p /srv/foodbot/data
sudo chown -R $USER:$USER /srv/foodbot
```

### Step 3. Clone the repository

```bash
cd /srv/foodbot
git clone https://github.com/RazBudimirRus/food-diary-v2.git .
```

### Step 4. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Minimum `.env`:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef-your_token_from_BotFather
API_BASE_URL=http://api:5000
```

### Step 5. Start

```bash
docker compose up -d --build
```

Check status:
```bash
docker compose ps
docker compose logs -f
```

### Step 6. Access

| Service | URL |
|---|---|
| Web form | `http://<server_ip>:5000` |
| API health | `http://<server_ip>:5000/api/now` |
| Telegram bot | Find by name in Telegram, send `/start` |

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
cd /srv/foodbot
git pull
docker compose up -d --build
```

### Database backup

```bash
# Manual backup
cp /srv/foodbot/data/data.db /backup/data-$(date +%Y%m%d_%H%M%S).db

# Automated (cron, daily at 03:00)
echo "0 3 * * * cp /srv/foodbot/data/data.db /backup/data-\$(date +\%Y\%m\%d).db" | crontab -
```

## Usage

### Web Form

1. Open `http://<server>:5000`
2. Use the arrow buttons in the header to navigate between dates (future dates are disabled)
3. Click **"Add meal"** → fill out the form
4. Click **"Report"** in the header → if day summary isn't filled yet, a dialog opens (wake/bedtime/sport/steps). On repeat downloads the dialog is skipped
5. File downloads as `Дневник_питания_YYYY-MM-DD.xlsx`

### Telegram Bot

| Command | Action |
|---|---|
| `/start` | Welcome message and command list |
| `/add` | Add a meal (step-by-step FSM dialog) |
| `/today` | Show all entries for today |
| `/report` | Download Excel report for today |
| `/report 2026-06-25` | Download Excel for a specific date |
| `/summary` | Fill in day summary (wake time, sport, steps) |

> **Important:** one day = 00:00–23:59 MSK (UTC+3). Entries always use Moscow time regardless of the device's timezone.

## Project Structure

```
food-diary-v2/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── pages/DiaryPage.tsx # Main diary interface
│       ├── components/ui/      # shadcn/ui components
│       └── lib/queryClient.ts  # API client (TanStack Query)
│
├── server/                     # Node.js backend (Express)
│   ├── routes.ts               # REST API endpoints
│   ├── storage.ts              # Drizzle ORM + SQLite
│   └── excel.ts                # Excel report generator
│
├── shared/
│   └── schema.ts               # Drizzle schema (users, days, meals)
│
├── bot/                        # Python Telegram bot
│   ├── bot.py                  # aiogram 3 FSM bot
│   └── requirements.txt
│
├── docker-compose.yml          # Container orchestration
├── Dockerfile.api              # Node.js container
├── bot/Dockerfile.bot          # Python container
├── Caddyfile                   # Reverse proxy config
├── preflight-check.sh          # Pre-install server check
├── DEPLOY.md                   # Detailed deploy guide (RU)
└── .env.example                # Environment template
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/days/:date` | Get day + meals (YYYY-MM-DD) |
| POST | `/api/meals` | Add meal (web user) |
| DELETE | `/api/meals/:id` | Delete meal |
| PATCH | `/api/meals/:id` | Update meal |
| POST | `/api/days/:id/summary` | Save day summary |
| GET | `/api/report/:date` | Download Excel (202 if summary needed) |
| GET | `/api/now` | Current MSK date and time |
| GET | `/api/tg/users/:tgId` | Get Telegram user |
| POST | `/api/tg/users` | Register Telegram user |
| GET | `/api/tg/:tgId/days/:date` | Get day for TG user |
| POST | `/api/tg/:tgId/meals` | Add meal for TG user |
| POST | `/api/tg/:tgId/days/:date/summary` | Save day summary for TG user |
| GET | `/api/tg/:tgId/report/:date` | Download report for TG user |

## Roadmap

- [x] V1: текстовый ввод, веб-форма, Telegram-бот, Excel-отчёт
- [ ] V2: распознавание фото через GigaChat Vision (Сбер)
- [ ] V3: автоматический подсчёт КБЖУ (FatSecret / USDA API)
- [ ] V4: статистика и графики по неделям/месяцам

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for health tracking · <a href="https://github.com/RazBudimirRus">@RazBudimirRus</a>
</div>
