import type { Express, NextFunction } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, hashPassword, type AuthRequest } from "../auth";
import { auditLog } from "../audit";
import { publicUser, paramValue, generateTemporaryPassword, deepseekDailyLimitStatus } from "./helpers";
import { ApiError } from "../errors";

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/users", requireAuth, requireAdmin, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const users = storage.listUsers().map(publicUser);
      void auditLog(req, "admin.view_user");
      res.json({ users });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/admin/sessions", requireAuth, requireAdmin, (_req: AuthRequest, res, next: NextFunction) => {
    try {
      res.json({ sessions: storage.listActiveRefreshSessions() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/admin/deepseek/usage", requireAuth, requireAdmin, (_req: AuthRequest, res, next: NextFunction) => {
    try {
      const now = new Date();
      const from = new Date(now);
      from.setUTCDate(from.getUTCDate() - 30);
      const summary = storage.getApiUsageSummary(from.toISOString(), now.toISOString());
      const limitStatus = deepseekDailyLimitStatus(now);

      res.json({
        ...summary,
        ...limitStatus,
        analysisBlocked: limitStatus.dailyLimitExceeded,
      });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/admin/sessions/:id/revoke", requireAuth, requireAdmin, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const sessionId = Number(req.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) throw ApiError.badRequest("Invalid session id");

      const revoked = storage.revokeRefreshSessionById(sessionId);
      if (!revoked) throw ApiError.notFound("Session not found");
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    "/api/admin/users/:id/revoke-sessions",
    requireAuth,
    requireAdmin,
    (req: AuthRequest, res, next: NextFunction) => {
      try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) throw ApiError.badRequest("Invalid user id");
        if (!storage.getUserById(userId)) throw ApiError.notFound("User not found");

        storage.revokeUserRefreshTokens(userId);
        void auditLog(req, "admin.revoke_sessions", userId);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/admin/users/:id/reset-password",
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res, next: NextFunction) => {
      try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) throw ApiError.badRequest("Invalid user id");
        if (!storage.getUserById(userId)) throw ApiError.notFound("User not found");

        const temporaryPassword = generateTemporaryPassword();
        const passwordHash = await hashPassword(temporaryPassword);
        const user = storage.updateUserPassword(userId, passwordHash);
        if (!user) throw ApiError.notFound("User not found");

        storage.revokeUserRefreshTokens(userId);
        void auditLog(req, "admin.reset_password", userId);
        res.json({ user: publicUser(user), temporaryPassword });
      } catch (e) {
        next(e);
      }
    },
  );

  /** GET /api/admin/audit-log — Phase 24 */
  app.get("/api/admin/audit-log", requireAuth, requireAdmin, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const actorRaw = req.query.actor as string | undefined;
      const targetRaw = req.query.target as string | undefined;
      const action = (req.query.action as string | undefined) || undefined;
      const from = (req.query.from as string | undefined) || undefined;
      const to = (req.query.to as string | undefined) || undefined;
      const limitRaw = req.query.limit as string | undefined;

      const actorId = actorRaw !== undefined ? Number(actorRaw) : undefined;
      if (actorId !== undefined && !Number.isInteger(actorId)) throw ApiError.badRequest("Invalid actor id");
      const targetId = targetRaw !== undefined ? Number(targetRaw) : undefined;
      if (targetId !== undefined && !Number.isInteger(targetId)) throw ApiError.badRequest("Invalid target id");
      const limit = limitRaw !== undefined ? Number(limitRaw) : 100;
      if (!Number.isInteger(limit) || limit <= 0) throw ApiError.badRequest("Invalid limit");

      const entries = await storage.getAuditLog({ actorId, targetId, action, from, to, limit });
      res.json({ entries });
    } catch (e) {
      next(e);
    }
  });

  /**
   * POST /api/admin/s3-test (admin only)
   * Performs a real round-trip: PutObject → GetObject → DeleteObject.
   * Returns { ok, detail, durationMs } for each step.
   */
  app.post("/api/admin/s3-test", requireAuth, requireAdmin, async (_req: AuthRequest, res, next: NextFunction) => {
    try {
      const { isS3Configured, uploadPhoto, downloadPhoto, deleteFromS3, buildPhotoKey } = await import("../s3");
      if (!isS3Configured()) {
        return res.status(503).json({ ok: false, detail: "S3 не настроен (нет VK_S3_ACCESS_KEY / VK_S3_SECRET_KEY)" });
      }

      const steps: Record<string, { ok: boolean; durationMs: number; detail?: string }> = {};
      const testKey = buildPhotoKey(0, `s3-test-${Date.now()}`);
      // Minimal 1×1 white JPEG
      const testBuf = Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
        "base64",
      );

      // Step 1: upload (PutObject via uploadPhoto which wraps sharp + S3)
      const t0 = Date.now();
      try {
        await uploadPhoto(testKey, testBuf, "image/jpeg");
        steps.put = { ok: true, durationMs: Date.now() - t0 };
      } catch (e: any) {
        steps.put = { ok: false, durationMs: Date.now() - t0, detail: e.message };
        return res.status(500).json({ ok: false, steps });
      }

      // Step 2: download (GetObject)
      const t1 = Date.now();
      try {
        const buf = await downloadPhoto(testKey);
        steps.get = { ok: buf.length > 0, durationMs: Date.now() - t1, detail: `${buf.length} bytes` };
      } catch (e: any) {
        steps.get = { ok: false, durationMs: Date.now() - t1, detail: e.message };
      }

      // Step 3: delete
      const t2 = Date.now();
      try {
        await deleteFromS3(testKey);
        steps.delete = { ok: true, durationMs: Date.now() - t2 };
      } catch (e: any) {
        steps.delete = { ok: false, durationMs: Date.now() - t2, detail: e.message };
      }

      const allOk = Object.values(steps).every((s) => s.ok);
      res.status(allOk ? 200 : 500).json({ ok: allOk, steps });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/admin/s3-stats — UX-S3-1: статистика объектов в бакете по пользователям */
  app.get("/api/admin/s3-stats", requireAuth, requireAdmin, async (_req: AuthRequest, res, next: NextFunction) => {
    try {
      const { isS3Configured, listBucketStats } = await import("../s3");
      if (!isS3Configured()) {
        return res.status(503).json({ ok: false, detail: "S3 не настроен" });
      }
      try {
        const stats = await listBucketStats();
        // Обогащаем userId именами пользователей из БД
        const users = storage.listUsers();
        const userMap = new Map(users.map((u) => [u.id, u.username]));
        const byUser = stats.byUser.map((s) => ({
          ...s,
          username: s.userId !== null ? (userMap.get(s.userId) ?? `user#${s.userId}`) : "—",
        }));
        res.json({ ...stats, byUser });
      } catch (e: any) {
        res.status(500).json({ ok: false, detail: e.message });
      }
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/admin/s3-upload-test — UX-S3-2: реальный upload/download/delete тест */
  app.post(
    "/api/admin/s3-upload-test",
    requireAuth,
    requireAdmin,
    async (_req: AuthRequest, res, next: NextFunction) => {
      try {
        const { isS3Configured, runUploadTest } = await import("../s3");
        if (!isS3Configured()) {
          return res.status(503).json({ ok: false, detail: "S3 не настроен" });
        }
        try {
          const result = await runUploadTest();
          const allOk = result.put.ok && result.get.ok && result.delete.ok;
          res.status(allOk ? 200 : 500).json({ ok: allOk, ...result });
        } catch (e: any) {
          res.status(500).json({ ok: false, detail: e.message });
        }
      } catch (e) {
        next(e);
      }
    },
  );

  /** GET /api/admin/deepseek-check — ADMIN-1: проверка доступности DeepSeek API + полный цикл */
  app.get(
    "/api/admin/deepseek-check",
    requireAuth,
    requireAdmin,
    async (_req: AuthRequest, res, next: NextFunction) => {
      try {
        const t0 = Date.now();
        const { isDeepSeekAvailable, analyzeNutrition } = await import("../deepseek");
        if (!isDeepSeekAvailable()) {
          return res.status(503).json({ ok: false, detail: "DEEPSEEK_API_KEY не настроен" });
        }
        try {
          const result = await analyzeNutrition("Два яйца варёных", undefined, null);
          res.json({
            ok: true,
            durationMs: Date.now() - t0,
            result,
          });
        } catch (e: any) {
          res.status(500).json({
            ok: false,
            durationMs: Date.now() - t0,
            detail: e.message,
          });
        }
      } catch (e) {
        next(e);
      }
    },
  );

  /** POST /api/admin/deepseek-raw-test — получить raw-ответ DeepSeek для диагностики */
  app.post(
    "/api/admin/deepseek-raw-test",
    requireAuth,
    requireAdmin,
    async (_req: AuthRequest, res, next: NextFunction) => {
      try {
        const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
        const { decryptSecret } = await import("../auth");
        const { storage: st } = await import("../storage");
        // Mirror the production request options, otherwise this diagnostic reports
        // behaviour the real КБЖУ path no longer has (PERF-01).
        const { DEEPSEEK_MODEL, DEEPSEEK_THINKING } = await import("../deepseek");
        const secret = st.getSecret(0, "__deepseek_api_key__");
        if (!secret) throw ApiError.badRequest("DEEPSEEK_API_KEY не настроен");
        let apiKey: string;
        try {
          apiKey = decryptSecret(secret.encryptedValue, secret.iv);
        } catch {
          throw new ApiError(500, "Ошибка дешифровки ключа", "internal_error");
        }
        const startedAt = Date.now();
        const r = await fetch(DEEPSEEK_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [
              { role: "system", content: "You are a nutrition analyst. Respond with ONLY valid JSON." },
              {
                role: "user",
                content:
                  'Estimate: Еда: два чизбургера\nRespond: {"calories": <int>, "protein": <float>, "fat": <float>, "carbs": <float>, "note": "<str>"}',
              },
            ],
            thinking: { type: DEEPSEEK_THINKING },
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 400,
          }),
        });
        const raw = await r.text();
        res.json({ httpStatus: r.status, durationMs: Date.now() - startedAt, thinking: DEEPSEEK_THINKING, raw });
      } catch (e) {
        next(e);
      }
    },
  );

  /** POST /api/admin/users/:id/set-role (admin only) */
  app.post("/api/admin/users/:id/set-role", requireAuth, requireAdmin, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const userId = parseInt(paramValue(req.params.id), 10);
      const { role } = req.body;
      if (!["user", "doctor", "admin"].includes(role)) {
        throw ApiError.badRequest("Допустимые роли: user, doctor, admin");
      }
      const updated = storage.setUserRole(userId, role as "user" | "doctor" | "admin");
      if (!updated) throw ApiError.notFound("Пользователь не найден");
      void auditLog(req, "admin.set_role", userId, { role });
      res.json({ user: publicUser(updated) });
    } catch (e) {
      next(e);
    }
  });
}
