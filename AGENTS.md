# AGENTS.md

## Cursor Cloud specific instructions

Food Diary V2 is a **single unified Node.js process** (Express API + React/Vite SPA) that serves everything on **port 5000**. Data lives in an **embedded SQLite** DB (`better-sqlite3`); there is no separate database server, and Drizzle migrations run automatically at startup. All other integrations (DeepSeek AI, VK/S3 photo storage, SMTP, Web Push/VAPID, Sentry, the Python Telegram bot in `bot/`) are optional — the app boots and degrades gracefully without them.

Standard commands live in `package.json` scripts and the README "Быстрый старт" / "Тесты" sections; use those. Notes below are the non-obvious caveats.

### Running the dev server (important caveat)

`npm run dev` runs `tsx server/index.ts` as **native ESM** (`"type": "module"` in `package.json`). A few server modules reference the CommonJS-only `__dirname` at module scope (e.g. `server/analytics-pdf.ts`), which throws `ReferenceError: __dirname is not defined in ES module scope` and crashes startup. This only affects the tsx dev path — the production build bundles to CommonJS (`dist/index.cjs`), where `__dirname` exists.

To run the dev server (with Vite HMR), preload the additive shim that defines the missing globals:

```bash
NODE_OPTIONS="--import file://$PWD/scripts/dev-esm-dirname-shim.mjs" npm run dev
```

The server then listens on `http://localhost:5000` (API + Vite-served SPA). `JWT_SECRET`/`ENCRYPTION_KEY` are not required in development (insecure dev defaults are used); no `.env` is needed to boot. The shim is dev-only and touches no application code; do not use it for production (`npm run build && npm start`, which needs `NODE_ENV=production`, `JWT_SECRET`, `ENCRYPTION_KEY`).

### Data directory

The default DB path is `data/data.db`, and `better-sqlite3` will not create the parent directory. The `data/` directory must exist before first boot (the update script creates it). `data/` is gitignored.

### Lint / typecheck / test / build

- Lint: `npm run lint` (ESLint; currently passes with a few unused-var warnings, 0 errors).
- Typecheck: `npm run typecheck` (`tsc --noEmit`).
- Tests: `npm test` (Vitest, ~303 unit/integration tests). E2E: `npm run test:e2e` (builds first, then Playwright; needs `npx playwright install --with-deps chromium`).
- Build: `npm run build` (Vite client + esbuild server → `dist/`).

The `pre-commit` hook runs `lint-staged` (eslint --fix + prettier) on staged files.
