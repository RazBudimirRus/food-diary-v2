/**
 * Express app factory (Phase 29 W5) — helmet / cors / parsers / CSRF / request logging.
 * Importing this module does not open SQLite or run migrations.
 */
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import { csrfMiddleware } from "./csrf";
import { logger, requestContext } from "./logger";
import { registry, httpRequestsTotal, httpRequestDurationMs } from "./metrics";

export function allowedOrigins(): string[] {
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

export function createApp(): Express {
  const app = express();

  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
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
      hsts:
        process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
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

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: unknown }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(csrfMiddleware);

  app.use((req, res, next) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    const start = Date.now();

    requestContext.run({ requestId }, () => {
      res.setHeader("X-Request-ID", requestId);

      res.on("finish", () => {
        const duration = Date.now() - start;
        const route = req.route?.path ?? req.path;
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

  app.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).end();
    }
  });

  return app;
}
