import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  upsertUserProfileSchema,
} from "@shared/schema";
import {
  hashPassword,
  verifyPassword,
  requireAuth,
  encryptSecret,
  decryptSecret,
  clearRefreshCookieOptions,
  clearLegacyAuthCookieOptions,
  hashToken,
  type AuthRequest,
} from "../auth";
import { isSmtpConfigured, sendPasswordResetEmail } from "../mail";
import { setCsrfToken } from "../csrf";
import { loginLimiter, forgotPasswordLimiter } from "./limiters";
import {
  publicUser,
  paramValue,
  issueSession,
  passwordResetExpiresAt,
  forgotPasswordResponse,
  refreshCookieName,
} from "./helpers";

export function registerAuthRoutes(app: Express) {
  /** POST /api/auth/register */
  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { username, email, password, displayName } = parsed.data;

    if (storage.getUserByUsername(username))
      return res.status(409).json({ error: "Пользователь с таким именем уже существует" });
    if (storage.getUserByEmail(email)) return res.status(409).json({ error: "Email уже зарегистрирован" });

    const passwordHash = await hashPassword(password);
    const pdConsentAt = new Date().toISOString();
    const user = storage.createUser({ username, email, passwordHash, displayName, pdConsentAt });

    res.json(issueSession(req, res, user));
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { username, password } = parsed.data;
    const user = storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Неверный логин или пароль" });

    storage.setLastLogin(user.id);
    res.json(issueSession(req, res, user));
  });

  /** POST /api/auth/refresh */
  app.post("/api/auth/refresh", (req, res) => {
    const rawRefreshToken = req.cookies?.[refreshCookieName];
    if (!rawRefreshToken) return res.status(401).json({ error: "Refresh token отсутствует" });

    const tokenHash = hashToken(rawRefreshToken);
    const record = storage.getRefreshToken(tokenHash);
    if (!record || record.revoked || new Date(record.expiresAt).getTime() <= Date.now()) {
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
      return res.status(401).json({ error: "Refresh token недействителен или истёк" });
    }

    const user = storage.getUserById(record.userId);
    if (!user) {
      storage.revokeRefreshToken(tokenHash);
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    storage.revokeRefreshToken(tokenHash);
    res.json(issueSession(req, res, user));
  });

  /** POST /api/auth/logout */
  app.post("/api/auth/logout", (req, res) => {
    const rawRefreshToken = req.cookies?.[refreshCookieName];
    if (rawRefreshToken) {
      storage.revokeRefreshToken(hashToken(rawRefreshToken));
    }
    res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
    res.clearCookie("token", clearLegacyAuthCookieOptions());
    res.json({ ok: true });
  });

  /** GET /api/auth/me */
  app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => {
    const u = req.user!;
    const csrfToken = setCsrfToken(req, res);
    res.json({ ...publicUser(u), csrfToken });
  });

  /** PUT /api/profile — update displayName */
  app.put("/api/profile", requireAuth, (req: AuthRequest, res) => {
    const { displayName } = req.body;
    if (displayName !== undefined && (typeof displayName !== "string" || displayName.length > 64)) {
      return res.status(400).json({ error: "Некорректное имя" });
    }
    const updated = storage.updateUserProfile(req.user!.id, { displayName });
    if (!updated) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(publicUser(updated));
  });

  /** POST /api/auth/forgot-password */
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    if (!isSmtpConfigured()) {
      return res.status(503).json({ error: "Сброс пароля по email временно недоступен" });
    }

    const user = storage.getUserByEmail(parsed.data.email);
    if (user) {
      const rawToken = crypto.randomUUID();
      storage.createPasswordResetToken({
        token: hashToken(rawToken),
        userId: user.id,
        expiresAt: passwordResetExpiresAt().toISOString(),
      });

      const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
      // Phase 28.3: ссылка ведёт на настоящий путь /reset-password (а не на хэш-маршрут)
      const resetUrl = `${publicUrl}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }

    res.json(forgotPasswordResponse);
  });

  /** POST /api/auth/reset-password */
  app.post("/api/auth/reset-password", async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const tokenHash = hashToken(parsed.data.token);
    const record = storage.getPasswordResetToken(tokenHash);
    if (!record || record.used || new Date(record.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: "Ссылка для сброса пароля недействительна или истекла" });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    storage.updateUserPassword(record.userId, passwordHash);
    storage.markPasswordResetTokenUsed(record.id);
    storage.revokeUserRefreshTokens(record.userId);

    res.json({ ok: true });
  });

  // ── Secrets (encrypted key-value store per user) ───────────────────────────

  /** GET /api/secrets — list keys (values never returned) */
  app.get("/api/secrets", requireAuth, (req: AuthRequest, res) => {
    const keys = storage.listSecretKeys(req.user!.id);
    res.json({ keys });
  });

  /** PUT /api/secrets/:key — set/update a secret */
  app.put("/api/secrets/:key", requireAuth, (req: AuthRequest, res) => {
    const { value } = req.body;
    if (typeof value !== "string" || !value) return res.status(400).json({ error: "value required" });
    const { encryptedValue, iv } = encryptSecret(value);
    const secret = storage.setSecret(req.user!.id, paramValue(req.params.key), encryptedValue, iv);
    res.json({ key: secret.key, updatedAt: secret.updatedAt });
  });

  /** GET /api/secrets/:key/value — decrypt and return a single secret value */
  app.get("/api/secrets/:key/value", requireAuth, (req: AuthRequest, res) => {
    const s = storage.getSecret(req.user!.id, paramValue(req.params.key));
    if (!s) return res.status(404).json({ error: "Not found" });
    try {
      const value = decryptSecret(s.encryptedValue, s.iv);
      res.json({ key: s.key, value });
    } catch {
      res.status(500).json({ error: "Decryption failed" });
    }
  });

  // ── Phase 16: 152-ФЗ ────────────────────────────────────────────────────────

  /** DELETE /api/user/me — full account deletion (152-ФЗ) */
  app.delete("/api/user/me", requireAuth, (req: AuthRequest, res) => {
    try {
      storage.deleteUser(req.user!.id);
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
      res.clearCookie("token", clearLegacyAuthCookieOptions());
      res.json({ ok: true, message: "Аккаунт и все данные удалены" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/user/export — export all personal data as JSON (152-ФЗ) */
  app.get("/api/user/export", requireAuth, (req: AuthRequest, res) => {
    try {
      const data = storage.getUserAllData(req.user!.id);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent("my_data.json")}`);
      res.send(JSON.stringify(data, null, 2));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Phase 17: Анкета пользователя ────────────────────────────────────────────

  /** GET /api/user/profile */
  app.get("/api/user/profile", requireAuth, (req: AuthRequest, res) => {
    const profile = storage.getUserProfile(req.user!.id);
    res.json({ profile: profile ?? null });
  });

  /** PUT /api/user/profile */
  app.put("/api/user/profile", requireAuth, (req: AuthRequest, res) => {
    const parsed = upsertUserProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const profile = storage.upsertUserProfile(req.user!.id, parsed.data);
      res.json({ profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Phase 20 — Dietary Restrictions
  // ════════════════════════════════════════════════════════════════════

  /** GET /api/user/dietary-restrictions */
  app.get("/api/user/dietary-restrictions", requireAuth, (req: AuthRequest, res) => {
    const profile = storage.getUserProfile(req.user!.id);
    const raw = profile?.dietaryRestrictions;
    let parsed: string[] = [];
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
    res.json({ restrictions: parsed });
  });

  /** PUT /api/user/dietary-restrictions */
  app.put("/api/user/dietary-restrictions", requireAuth, (req: AuthRequest, res) => {
    const { restrictions } = req.body;
    if (!Array.isArray(restrictions)) return res.status(400).json({ error: "restrictions must be array" });
    const json = JSON.stringify(restrictions.map(String).slice(0, 50));
    const profile = storage.upsertDietaryRestrictions(req.user!.id, json);
    res.json({ profile });
  });

  /** GET /api/user/my-doctor */
  app.get("/api/user/my-doctor", requireAuth, (req: AuthRequest, res) => {
    const doctor = storage.getPatientDoctor(req.user!.id);
    res.json({ doctor: doctor ?? null });
  });
}
