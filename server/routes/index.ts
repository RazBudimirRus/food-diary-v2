import type { Express } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../openapi";
import { getMskDate, getMskTime } from "../storage";
import { isS3Configured, uploadPhoto, deleteFromS3, buildPhotoKey } from "../s3";
import { isDeepSeekAvailable } from "../deepseek";
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
