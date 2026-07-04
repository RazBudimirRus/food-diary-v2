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
