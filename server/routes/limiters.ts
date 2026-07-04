import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { AuthRequest } from "../auth";
import { LOGIN_RATE_WINDOW_MS, LOGIN_RATE_MAX, MEAL_CREATE_RATE_WINDOW_MS } from "../config";

// NOTE: limit values preserved verbatim from original server/routes.ts
// (loginLimiter: 10/15min, forgotPasswordLimiter: 3/15min, mealCreateLimiter: 60/min)
// even though some named config constants suggest different defaults —
// behavior must remain identical to the original implementation.

export const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,
  limit: LOGIN_RATE_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket.remoteAddress || "0.0.0.0"),
  message: { error: "Слишком много запросов на сброс пароля. Попробуйте позже." },
});

export const mealCreateLimiter = rateLimit({
  windowMs: MEAL_CREATE_RATE_WINDOW_MS,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) =>
    req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || "0.0.0.0")}`,
  message: { error: "Слишком много запросов. Попробуйте позже." },
});
