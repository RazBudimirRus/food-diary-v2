# ADR-003 — wouter вместо react-router-dom

**Дата:** 2026-06-25  
**Статус:** Принято  
**Автор:** Глеб Сердитых

## Контекст

Выбор клиентского роутера для React SPA в приложении дневника питания.

## Решение

Использовать `wouter` с `useHashLocation` (hash-based routing).

## Последствия

**Плюсы:**

- Размер bundle: wouter ~2 KB vs react-router-dom ~50 KB
- Hash routing решает проблему SPA в iframe и при деплое без server-side fallback
- Минималистичный API — только `<Route>`, `<Link>`, `useLocation`

**Минусы:**

- Меньше экосистема (нет `<NavLink>`, `<Outlet>`, nested routes из коробки)
- Hash URLs (`/#/diary`) менее «красивые» чем `/diary`

**Почему hash routing:** приложение деплоится в Docker за nginx, hash routing не требует `try_files` конфигурации и работает из iframe при тестировании в Perplexity Computer.
