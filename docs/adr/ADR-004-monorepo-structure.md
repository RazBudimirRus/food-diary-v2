# ADR-004 — Монорепо без Turborepo/Nx

**Дата:** 2026-06-25  
**Статус:** Принято  
**Автор:** Глеб Сердитых

## Контекст

Проект содержит frontend (React/Vite), backend (Express/Node), и shared код (schema, dates). Нужна структура для их совместного размещения.

## Решение

Единый `package.json` в корне с `workspaces`. Shared код в `shared/`, backend в `server/`, frontend в `client/`. Без Turborepo, Nx или lerna.

## Последствия

**Плюсы:**

- Простота: один `npm install`, один `tsconfig`, одна CI-конфигурация
- `@shared/*` пути настроены через `tsconfig.paths` и `vite.resolve.alias`
- Docker-образ строится из одного `Dockerfile` с multi-stage build

**Минусы:**

- Нет инкрементальной сборки (Turborepo кеширует по-задаче)
- При росте проекта (3+ пакета) придётся добавить orchestrator

**Порог для добавления Turborepo:** > 3 независимых пакета или CI build > 5 минут.
