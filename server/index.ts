import "dotenv/config";
import express, { Response, NextFunction } from "express";
import type { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { initDeepSeekKey } from "./deepseek";
import { storage } from "./storage";
import { runMigrations } from "./migrate";
import { logger, requestContext } from "./logger";
import { registry, httpRequestsTotal, httpRequestDurationMs } from "./metrics";
import { initSentry } from "./sentry";
import { randomUUID } from "crypto";

// Phase 27.3: init Sentry before everything else
initSentry();

const app = express();
const httpServer = createServer(app);

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

function allowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const publicUrl = process.env.PUBLIC_URL ? [process.env.PUBLIC_URL] : [];
  const domainUrl = process.env.DOMAIN ? [`https://${process.env.DOMAIN}`] : [];
  const devOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5000", "http://localhost:5173", "http://127.0.0.1:5000", "http://127.0.0.1:5173"];

  return Array.from(new Set([...configured, ...publicUrl, ...domainUrl, ...devOrigins]));
}

app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:"],
              fontSrc: ["'self'", "data:"],
              connectSrc: ["'self'"],
            },
          }
        : false,
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }),
);

const corsOrigins = allowedOrigins();
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Phase 27.1: keep legacy log() for backward compat — now delegates to pino
export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

// Phase 27.1: request_id + structured HTTP logging middleware
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const start = Date.now();

  requestContext.run({ requestId }, () => {
    res.setHeader("X-Request-ID", requestId);

    res.on("finish", () => {
      const duration = Date.now() - start;
      const route = req.route?.path ?? req.path;
      // Phase 27.4: record Prometheus metrics
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      httpRequestsTotal.inc(labels);
      httpRequestDurationMs.observe(labels, duration);

      if (req.path.startsWith("/api")) {
        logger.info(
          { method: req.method, path: req.path, status: res.statusCode, durationMs: duration, requestId },
          "request",
        );
      }
    });

    next();
  });
});

// Phase 27.4: /metrics endpoint for Prometheus scraping
app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  } catch {
    res.status(500).end();
  }
});

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
