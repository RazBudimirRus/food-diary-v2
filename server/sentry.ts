/**
 * Sentry / GlitchTip error tracking (Phase 27.3)
 *
 * Активируется только если SENTRY_DSN задан в .env
 * GlitchTip self-hosted: совместим с тем же SDK и DSN-форматом.
 *
 * .env:
 *   SENTRY_DSN=https://xxx@sentry.io/yyy   # или GlitchTip URL
 *   SENTRY_ENV=production                   # опционально
 */
import * as Sentry from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return; // Sentry не настроен — пропускаем
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "production",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });

  console.info("[sentry] initialized with DSN");
}

export { Sentry };
