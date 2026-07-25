/**
 * errorReporter.ts — отправляет клиентские ошибки на сервер.
 * POST /api/client-errors (rate limit 20/мин на сервере)
 * Не бросает исключений — тихо игнорирует сетевые ошибки.
 */

const ENDPOINT = "/api/client-errors";
let lastReported = 0; // throttle: не чаще 1 раза в 2 сек на клиенте

export async function reportError(payload: {
  message: string;
  stack?: string | null;
  url?: string | null;
  extra?: Record<string, unknown> | null;
}): Promise<void> {
  const now = Date.now();
  if (now - lastReported < 2000) return; // throttle
  lastReported = now;

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.message,
        stack: payload.stack ?? null,
        url: payload.url ?? window.location.href,
        extra: payload.extra ?? null,
      }),
      // Не ждём долго — ошибки вторичны
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Тихо игнорируем — не создаём бесконечный цикл ошибок
  }
}
