import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, hashPassword, type AuthRequest } from "../auth";
import { auditLog } from "../audit";
import { publicUser, paramValue, generateTemporaryPassword, deepseekDailyLimitStatus } from "./helpers";

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/users", requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const users = storage.listUsers().map(publicUser);
    void auditLog(req, "admin.view_user");
    res.json({ users });
  });

  app.get("/api/admin/sessions", requireAuth, requireAdmin, (_req: AuthRequest, res) => {
    res.json({ sessions: storage.listActiveRefreshSessions() });
  });

  app.get("/api/admin/deepseek/usage", requireAuth, requireAdmin, (_req: AuthRequest, res) => {
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
  });

  app.post("/api/admin/sessions/:id/revoke", requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) return res.status(400).json({ error: "Invalid session id" });

    const revoked = storage.revokeRefreshSessionById(sessionId);
    if (!revoked) return res.status(404).json({ error: "Session not found" });
    res.json({ ok: true });
  });

  app.post("/api/admin/users/:id/revoke-sessions", requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Invalid user id" });
    if (!storage.getUserById(userId)) return res.status(404).json({ error: "User not found" });

    storage.revokeUserRefreshTokens(userId);
    void auditLog(req, "admin.revoke_sessions", userId);
    res.json({ ok: true });
  });

  app.post("/api/admin/users/:id/reset-password", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Invalid user id" });
    if (!storage.getUserById(userId)) return res.status(404).json({ error: "User not found" });

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const user = storage.updateUserPassword(userId, passwordHash);
    if (!user) return res.status(404).json({ error: "User not found" });

    storage.revokeUserRefreshTokens(userId);
    void auditLog(req, "admin.reset_password", userId);
    res.json({ user: publicUser(user), temporaryPassword });
  });

  /** GET /api/admin/audit-log — Phase 24 */
  app.get("/api/admin/audit-log", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const actorRaw = req.query.actor as string | undefined;
    const targetRaw = req.query.target as string | undefined;
    const action = (req.query.action as string | undefined) || undefined;
    const from = (req.query.from as string | undefined) || undefined;
    const to = (req.query.to as string | undefined) || undefined;
    const limitRaw = req.query.limit as string | undefined;

    const actorId = actorRaw !== undefined ? Number(actorRaw) : undefined;
    if (actorId !== undefined && !Number.isInteger(actorId)) return res.status(400).json({ error: "Invalid actor id" });
    const targetId = targetRaw !== undefined ? Number(targetRaw) : undefined;
    if (targetId !== undefined && !Number.isInteger(targetId))
      return res.status(400).json({ error: "Invalid target id" });
    const limit = limitRaw !== undefined ? Number(limitRaw) : 100;
    if (!Number.isInteger(limit) || limit <= 0) return res.status(400).json({ error: "Invalid limit" });

    const entries = await storage.getAuditLog({ actorId, targetId, action, from, to, limit });
    res.json({ entries });
  });

  /**
   * POST /api/admin/s3-test (admin only)
   * Performs a real round-trip: PutObject → GetObject → DeleteObject.
   * Returns { ok, detail, durationMs } for each step.
   */
  app.post("/api/admin/s3-test", requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
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
  });

  /** POST /api/admin/deepseek-raw-test — получить raw-ответ DeepSeek для диагностики */
  app.post("/api/admin/deepseek-raw-test", requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
    const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
    const { decryptSecret } = await import("../auth");
    const { storage: st } = await import("../storage");
    const secret = st.getSecret(0, "__deepseek_api_key__");
    if (!secret) return res.status(400).json({ error: "DEEPSEEK_API_KEY не настроен" });
    let apiKey: string;
    try {
      apiKey = decryptSecret(secret.encryptedValue, secret.iv);
    } catch {
      return res.status(500).json({ error: "Ошибка дешифровки ключа" });
    }
    try {
      const r = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: [
            { role: "system", content: "You are a nutrition analyst. Respond with ONLY valid JSON." },
            {
              role: "user",
              content:
                'Estimate: Еда: два чизбургера\nRespond: {"calories": <int>, "protein": <float>, "fat": <float>, "carbs": <float>, "note": "<str>"}',
            },
          ],
          temperature: 0.1,
          max_tokens: 400,
        }),
      });
      const raw = await r.text();
      res.json({ httpStatus: r.status, raw });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/admin/users/:id/set-role (admin only) */
  app.post("/api/admin/users/:id/set-role", requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const userId = parseInt(paramValue(req.params.id), 10);
    const { role } = req.body;
    if (!["user", "doctor", "admin"].includes(role)) {
      return res.status(400).json({ error: "Допустимые роли: user, doctor, admin" });
    }
    const updated = storage.setUserRole(userId, role as "user" | "doctor" | "admin");
    if (!updated) return res.status(404).json({ error: "Пользователь не найден" });
    void auditLog(req, "admin.set_role", userId, { role });
    res.json({ user: updated });
  });
}
