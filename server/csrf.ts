import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Phase 28.2 — CSRF protection (double-submit cookie pattern).
 *
 * Идея: сервер выставляет случайный токен в non-HttpOnly cookie `csrf_token`
 * (и дублирует его в JSON-ответе GET /api/auth/me). Клиент читает cookie и
 * обязан присылать тот же токен в заголовке `X-CSRF-Token` для всех
 * "мутирующих" запросов (POST/PUT/PATCH/DELETE). Так как сторонний сайт не
 * может прочитать cookie другого домена (Same-Origin Policy), подделать
 * заголовок он не сможет — это и защищает от CSRF.
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Пути, для которых не требуется CSRF-токен (например логин/регистрация —
// на этом этапе у клиента ещё нет cookie с токеном).
const EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Выставляет csrf cookie, если её ещё нет у клиента. Возвращает актуальный токен. */
export function setCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const token = existing && existing.length === 64 ? existing : generateCsrfToken();

  if (!existing) {
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // клиенту нужно читать этот cookie на JS-стороне
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return token;
}

/** Express middleware: проверяет CSRF-токен для мутирующих запросов. */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Всегда убеждаемся, что у клиента есть актуальный cookie-токен.
  setCsrfToken(req, res);

  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();
  if (!req.path.startsWith("/api")) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}
