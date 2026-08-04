import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import { createApp } from "./app";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { initDeepSeekKey } from "./deepseek";
import { storage } from "./storage";
import { runMigrations } from "./migrate";
import { logger, requestContext } from "./logger";
import { initSentry } from "./sentry";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Phase 27.3: init Sentry before everything else
initSentry();

const app = createApp();
const httpServer = createServer(app);

// Phase 27.1: keep legacy log() for backward compat — now delegates to pino
export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

(async () => {
  // Phase 26.1: Run versioned migrations before anything else
  // Must match the default in storage.ts: process.env.SQLITE_DB_PATH || "data/data.db"
  const dbPath = process.env.SQLITE_DB_PATH ?? "data/data.db";
  runMigrations(dbPath);

  // Load DeepSeek key from env → encrypt → store in DB (idempotent)
  initDeepSeekKey();

  const adminBootstrapUsername = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim();
  if (adminBootstrapUsername) {
    const admin = storage.bootstrapAdminByUsername(adminBootstrapUsername);
    if (admin) {
      log(`admin bootstrap applied for user ${admin.username}`, "auth");
    } else {
      log(`ADMIN_BOOTSTRAP_USERNAME user not found: ${adminBootstrapUsername}`, "auth");
    }
  }

  storage.deleteExpiredOrRevokedRefreshTokens();
  setInterval(
    () => {
      storage.deleteExpiredOrRevokedRefreshTokens();
    },
    60 * 60 * 1000,
  );

  storage.deleteExpiredPasswordResetTokens();
  setInterval(
    () => {
      storage.deleteExpiredPasswordResetTokens();
    },
    60 * 60 * 1000,
  );

  // Phase 26.7: clean up expired idempotency keys every hour
  storage.deleteExpiredIdempotencyKeys();
  setInterval(
    () => {
      storage.deleteExpiredIdempotencyKeys();
    },
    60 * 60 * 1000,
  );

  // Phase 31.1: hard-delete meals soft-deleted more than 60s ago, runs every 5 minutes
  // Wrapped in try/catch: migration 0005 may not yet exist on older DBs at first boot
  try {
    storage.hardDeleteExpiredMeals();
  } catch (e: any) {
    log(`hardDeleteExpiredMeals skipped at startup: ${e.message}`, "migrate");
  }
  setInterval(
    () => {
      try {
        storage.hardDeleteExpiredMeals();
      } catch (e: any) {
        log(`hardDeleteExpiredMeals interval error: ${e.message}`, "migrate");
      }
    },
    5 * 60 * 1000,
  );

  await registerRoutes(httpServer, app);

  // Phase 27.5: prod error handler — no stack leak
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const ctx = requestContext.getStore();
    const requestId = ctx?.requestId ?? "unknown";

    logger.error({ err, status, requestId }, "unhandled error");

    if (res.headersSent) {
      return next(err);
    }

    if (process.env.NODE_ENV === "production") {
      // Never expose stack or internal message in production
      return res.status(status).json({
        error: status < 500 ? err.message || "Request error" : "Internal server error",
        requestId,
      });
    }

    return res.status(status).json({ error: err.message, stack: err.stack, requestId });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "0.0.0.0";
  httpServer.listen(
    {
      port,
      host,
      ...(process.platform === "win32" ? {} : { reusePort: true }),
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
