/**
 * Structured logging via pino (Phase 27.1)
 */
import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const transport =
  process.env.NODE_ENV !== "production"
    ? pino.transport({ target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } })
    : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
    mixin() {
      const ctx = requestContext.getStore();
      return ctx ? { requestId: ctx.requestId } : {};
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: "food-diary-api", env: process.env.NODE_ENV ?? "development" },
    redact: {
      paths: ["password", "password_hash", "token", "refreshToken", "secret"],
      censor: "[REDACTED]",
    },
  },
  transport ?? pino.destination({ sync: false }),
);

export type Logger = typeof logger;
