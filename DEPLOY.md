# Деплой Food Diary V2 на Ubuntu 24.04 VPS

**IP сервера:** 95.163.213.45

---

## 1. Подготовка сервера

```bash
# Установить Docker + Compose plugin
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Создать рабочую директорию
sudo mkdir -p /srv/foodbot/data
sudo chown -R $USER:$USER /srv/foodbot
```

## 2. Загрузить код

```bash
cd /srv/foodbot
# Вариант A: git clone (рекомендуется)
git clone <your-repo-url> .

# Вариант B: scp с локальной машины
# scp -r ./food-diary user@95.163.213.45:/srv/foodbot/
```

## 3. Создать .env

```bash
cp .env.example .env
nano .env
# Вписать TELEGRAM_BOT_TOKEN
```

## 4. Запустить

```bash
cd /srv/foodbot
docker compose up -d --build
docker compose logs -f
```

## 5. Проверить

```bash
# API health
curl http://localhost:5000/api/now

# Веб-форма
open http://95.163.213.45:5000
```

## 6. Фаервол (если нужен доступ снаружи)

```bash
# Открыть порт 5000 (или 80 если с Caddy)
sudo ufw allow 5000/tcp
sudo ufw allow 80/tcp
sudo ufw enable
```

## 7. Опционально — Caddy для доменного имени

Добавить в docker-compose.yml сервис caddy:

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

И добавить в секцию `volumes`: `caddy_data:` и `caddy_config:`

## 8. Обновление

```bash
cd /srv/foodbot
git pull
docker compose up -d --build
```

---

## Структура контейнеров

| Контейнер | Назначение | Порт |
|---|---|---|
| `food_diary_api` | Backend API + веб-форма (Node.js/Express) | 5000 |
| `food_diary_bot` | Telegram-бот (Python/aiogram) | — |

## База данных

SQLite `data.db` хранится в `/srv/foodbot/data/` (volume-mount).  
Бэкап: `cp /srv/foodbot/data/data.db /backup/data-$(date +%Y%m%d).db`
