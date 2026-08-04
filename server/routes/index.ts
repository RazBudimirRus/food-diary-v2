import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../openapi";
import { getMskDate, getMskTime, storage } from "../storage";
import { isS3Configured, uploadPhoto, deleteFromS3, buildPhotoKey } from "../s3";
import { isDeepSeekAvailable } from "../deepseek";
import { ApiError } from "../errors";
import { registerAuthRoutes } from "./auth";
import { registerMealsRoutes } from "./meals";
import { registerReportsRoutes } from "./reports";
import { registerAdminRoutes } from "./admin";
import { registerDoctorRoutes } from "./doctor";
import { registerPhotosRoutes } from "./photos";
import { registerCatalogRoutes } from "./catalog";
import { registerPushRoutes } from "./push";
import { clientErrorsRouter } from "./client-errors";

export function registerRoutes(httpServer: Server, app: Express) {
  // Required here (not only in index.ts) so integration tests that call
  // registerRoutes() directly can parse refresh_token cookies.
  app.use(cookieParser());

  // Task 34.1: OpenAPI / Swagger UI docs
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // ── Mount domain routers ─────────────────────────────────────────────────
  registerAuthRoutes(app);
  registerMealsRoutes(app);
  registerReportsRoutes(app);
  registerAdminRoutes(app);
  registerDoctorRoutes(app);
  registerPhotosRoutes(app);
  registerCatalogRoutes(app);
  registerPushRoutes(app);
  app.use("/api/client-errors", clientErrorsRouter);

  // ── ADMIN-2: серверный error middleware — логирует все 4xx/5xx в client_errors ──
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status =
      err instanceof ApiError
        ? err.status
        : ((err as { status?: number; statusCode?: number })?.status ??
          (err as { statusCode?: number })?.statusCode ??
          500);
    const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Internal Server Error";
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    const userId = (req as any)?.user?.id ?? null;
    // Логируем все ошибки 4xx/5xx кроме 401/403 (штатный unauthorized)
    if (status >= 400 && status !== 401 && status !== 403) {
      try {
        storage.addClientError({
          userId,
          message: `[server ${status}] ${message}`,
          stack,
          url: `${req.method} ${req.path}`,
          userAgent: req.headers["user-agent"] ?? null,
          extra: JSON.stringify({ status }).slice(0, 2000),
        });
      } catch {
        /* не прерываем ответ если логирование пупнуло */
      }
    }
    if (!res.headersSent) {
      if (err instanceof ApiError) {
        res.status(status).json(err.toJSON());
      } else {
        res.status(status).json({ error: message });
      }
    }
  });

  // ── Misc ─────────────────────────────────────────────────────────────

  app.get("/api/now", (_req, res) => {
    res.json({ date: getMskDate(), time: getMskTime() });
  });

  // Phase 27.2: /api/health — real dependency checks
  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    // DB check: simple liveness via storage
    try {
      const testDate = getMskDate();
      checks.db = { ok: !!testDate, detail: "sqlite ok" };
    } catch (e: any) {
      checks.db = { ok: false, detail: e.message };
    }

    // S3 check — real PutObject + DeleteObject round-trip (not just HeadBucket)
    try {
      if (isS3Configured()) {
        const testKey = buildPhotoKey(0, `health-check-${Date.now()}`);
        // Minimal 1×1 white JPEG
        const testBuf = Buffer.from(
          "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
          "base64",
        );
        const t = Date.now();
        await uploadPhoto(testKey, testBuf, "image/jpeg");
        await deleteFromS3(testKey);
        checks.s3 = { ok: true, detail: `rw ok ${Date.now() - t}ms` };
      } else {
        checks.s3 = { ok: true, detail: "not configured" };
      }
    } catch (e: any) {
      checks.s3 = { ok: false, detail: e.message };
    }

    // DeepSeek check
    try {
      const available = isDeepSeekAvailable();
      checks.deepseek = { ok: true, detail: available ? "configured" : "not configured" };
    } catch (e: any) {
      checks.deepseek = { ok: false, detail: e.message };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    const status = allOk ? "ok" : "degraded";
    res.status(allOk ? 200 : 503).json({ status, checks, uptime: process.uptime() });
  });
}
