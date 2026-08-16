import type { Express, NextFunction } from "express";
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
import { generateMfaSetup, verifyMfaToken } from "../mfa";
import { setCsrfToken } from "../csrf";
import { buildDoctorPdfOptions } from "./doctor-pdf-options";
import { loginLimiter, forgotPasswordLimiter } from "./limiters";
import {
  publicUser,
  redactUserForExport,
  paramValue,
  issueSession,
  passwordResetExpiresAt,
  forgotPasswordResponse,
  refreshCookieName,
} from "./helpers";
import { ApiError } from "../errors";
import { deleteFromS3 } from "../s3";

export function registerAuthRoutes(app: Express) {
  /** POST /api/auth/register */
  app.post("/api/auth/register", async (req, res, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());

      const { username, email, password, displayName } = parsed.data;

      if (storage.getUserByUsername(username)) throw ApiError.conflict("Пользователь с таким именем уже существует");
      if (storage.getUserByEmail(email)) throw ApiError.conflict("Email уже зарегистрирован");

      const passwordHash = await hashPassword(password);
      const pdConsentAt = new Date().toISOString();
      const user = storage.createUser({ username, email, passwordHash, displayName, pdConsentAt });

      res.json(issueSession(req, res, user));
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", loginLimiter, async (req, res, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());

      const { username, password } = parsed.data;
      const user = storage.getUserByUsername(username);
      if (!user) throw ApiError.unauthorized("Неверный логин или пароль");

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) throw ApiError.unauthorized("Неверный логин или пароль");

      // Phase 28.2: MFA second step for doctor/admin
      if (user.mfaEnabled && user.mfaSecret) {
        const { totp } = req.body as { totp?: string };
        if (!totp) {
          // Signal client to show TOTP prompt
          return res.status(202).json({ mfaRequired: true });
        }
        if (!verifyMfaToken(user.mfaSecret, totp)) {
          throw ApiError.unauthorized("Неверный код MFA");
        }
      }

      storage.setLastLogin(user.id);
      res.json(issueSession(req, res, user));
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/auth/refresh */
  app.post("/api/auth/refresh", (req, res, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.[refreshCookieName];
      if (!rawRefreshToken) throw ApiError.unauthorized("Refresh token отсутствует");

      const tokenHash = hashToken(rawRefreshToken);
      const record = storage.getRefreshToken(tokenHash);
      if (!record || record.revoked || new Date(record.expiresAt).getTime() <= Date.now()) {
        res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
        throw ApiError.unauthorized("Refresh token недействителен или истёк");
      }

      const user = storage.getUserById(record.userId);
      if (!user) {
        storage.revokeRefreshToken(tokenHash);
        res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
        throw ApiError.unauthorized("Пользователь не найден");
      }

      storage.revokeRefreshToken(tokenHash);
      res.json(issueSession(req, res, user));
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/auth/logout */
  app.post("/api/auth/logout", (req, res, next: NextFunction) => {
    try {
      const rawRefreshToken = req.cookies?.[refreshCookieName];
      if (rawRefreshToken) {
        storage.revokeRefreshToken(hashToken(rawRefreshToken));
      }
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
      res.clearCookie("token", clearLegacyAuthCookieOptions());
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/auth/me */
  app.get("/api/auth/me", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const u = req.user!;
      const csrfToken = setCsrfToken(req, res);
      res.json({ ...publicUser(u), csrfToken });
    } catch (e) {
      next(e);
    }
  });

  /** PUT /api/profile — update displayName */
  app.put("/api/profile", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { displayName } = req.body;
      if (displayName !== undefined && (typeof displayName !== "string" || displayName.length > 64)) {
        throw ApiError.badRequest("Некорректное имя");
      }
      const updated = storage.updateUserProfile(req.user!.id, { displayName });
      if (!updated) throw ApiError.notFound("Пользователь не найден");
      res.json(publicUser(updated));
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/auth/forgot-password */
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res, next: NextFunction) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());

      if (!isSmtpConfigured()) {
        throw new ApiError(503, "Сброс пароля по email временно недоступен", "service_unavailable");
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
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/auth/reset-password */
  app.post("/api/auth/reset-password", async (req, res, next: NextFunction) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());

      const tokenHash = hashToken(parsed.data.token);
      const record = storage.getPasswordResetToken(tokenHash);
      if (!record || record.used || new Date(record.expiresAt).getTime() <= Date.now()) {
        throw ApiError.badRequest("Ссылка для сброса пароля недействительна или истекла");
      }

      const passwordHash = await hashPassword(parsed.data.password);
      storage.updateUserPassword(record.userId, passwordHash);
      storage.markPasswordResetTokenUsed(record.id);
      storage.revokeUserRefreshTokens(record.userId);

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  // ── Secrets (encrypted key-value store per user) ───────────────────────────

  /** GET /api/secrets — list keys (values never returned) */
  app.get("/api/secrets", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const keys = storage.listSecretKeys(req.user!.id);
      res.json({ keys });
    } catch (e) {
      next(e);
    }
  });

  /** PUT /api/secrets/:key — set/update a secret */
  app.put("/api/secrets/:key", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string" || !value) throw ApiError.badRequest("value required");
      const { encryptedValue, iv } = encryptSecret(value);
      const secret = storage.setSecret(req.user!.id, paramValue(req.params.key), encryptedValue, iv);
      res.json({ key: secret.key, updatedAt: secret.updatedAt });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/secrets/:key/value — decrypt and return a single secret value */
  app.get("/api/secrets/:key/value", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const s = storage.getSecret(req.user!.id, paramValue(req.params.key));
      if (!s) throw ApiError.notFound("Not found");
      const value = decryptSecret(s.encryptedValue, s.iv);
      res.json({ key: s.key, value });
    } catch (e) {
      next(e);
    }
  });

  // ── Phase 16: 152-ФЗ ────────────────────────────────────────────────────────

  /** DELETE /api/user/me — full account deletion (152-ФЗ) */
  app.delete("/api/user/me", requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userPhotos = storage.getPhotosByUser(userId);
      for (const photo of userPhotos) {
        try {
          await deleteFromS3(photo.s3Key);
        } catch {
          // Best-effort: continue wiping DB even if an S3 object is already gone.
        }
      }
      storage.deleteUser(userId);
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions());
      res.clearCookie("token", clearLegacyAuthCookieOptions());
      res.json({ ok: true, message: "Аккаунт и все данные удалены" });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/user/export — export all personal data as JSON (152-ФЗ) */
  app.get("/api/user/export", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const data = storage.getUserAllData(req.user!.id);
      const safe = {
        ...data,
        user: data.user ? redactUserForExport(data.user) : undefined,
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent("my_data.json")}`);
      res.send(JSON.stringify(safe, null, 2));
    } catch (e) {
      next(e);
    }
  });

  // ── Phase 17: Анкета пользователя ────────────────────────────────────────────

  /** GET /api/user/profile */
  app.get("/api/user/profile", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const profile = storage.getUserProfile(req.user!.id);
      res.json({ profile: profile ?? null });
    } catch (e) {
      next(e);
    }
  });

  /**
   * GET /api/user/kbju-targets
   * Diagnostic: the exact `{ patientLabel, targets }` object the doctor PDF generator receives.
   */
  app.get("/api/user/kbju-targets", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      res.json(buildDoctorPdfOptions(req.user!.id));
    } catch (e) {
      next(e);
    }
  });

  /**
   * UX-20: Формула Миффлина-Сан Жеор — серверный пересчёт КБЖУ.
   * Используется, когда антропометрические поля меняются и kbjuManual === false.
   */
  function calcKbzhuServer(
    gender: string | null | undefined,
    heightCm: number | null | undefined,
    weightKg: number | null | undefined,
    activity: string | null | undefined,
  ): { targetKcal: number; targetProtein: number; targetFat: number; targetCarbs: number } | null {
    if (!heightCm || !weightKg || !gender || gender === "unspecified") return null;
    const ACTIVITY_COEFF: Record<string, number> = { minimal: 1.2, medium: 1.55, high: 1.725 };
    const age = 30; // возраст не запрашивается — нейтральное значение
    const bmr =
      gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const tdee = Math.round(bmr * (ACTIVITY_COEFF[activity ?? "medium"] ?? 1.55));
    const targetProtein = Math.round((tdee * 0.25) / 4);
    const targetFat = Math.round((tdee * 0.3) / 9);
    const targetCarbs = Math.round((tdee * 0.45) / 4);
    return { targetKcal: tdee, targetProtein, targetFat, targetCarbs };
  }

  /** PUT /api/user/profile */
  app.put("/api/user/profile", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const parsed = upsertUserProfileSchema.safeParse(req.body);
      if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());

      const userId = req.user!.id;
      const existing = storage.getUserProfile(userId);
      const data = { ...parsed.data } as typeof parsed.data;

      const kbjuFieldsProvided =
        data.targetKcal !== undefined ||
        data.targetProtein !== undefined ||
        data.targetFat !== undefined ||
        data.targetCarbs !== undefined;

      // Если КБЖУ поля переданы явно — это ручной ввод, приоритет за пользователем.
      if (kbjuFieldsProvided) {
        data.kbjuManual = true;
      }

      const anthropometricChanged =
        data.heightCm !== undefined ||
        data.weightKg !== undefined ||
        data.activityLevel !== undefined ||
        data.gender !== undefined;

      const effectiveKbjuManual = data.kbjuManual ?? existing?.kbjuManual ?? false;

      // Пересчитываем КБЖУ автоматически, только если антропометрия изменилась
      // и КБЖУ поля не были явно переданы, и ручной режим не включён.
      if (anthropometricChanged && !kbjuFieldsProvided && !effectiveKbjuManual) {
        const gender = data.gender ?? existing?.gender ?? "unspecified";
        const heightCm = data.heightCm ?? existing?.heightCm ?? null;
        const weightKg = data.weightKg ?? existing?.weightKg ?? null;
        const activityLevel = data.activityLevel ?? existing?.activityLevel ?? "medium";
        const calc = calcKbzhuServer(gender, heightCm, weightKg, activityLevel);
        if (calc) {
          data.targetKcal = calc.targetKcal;
          data.targetProtein = calc.targetProtein;
          data.targetFat = calc.targetFat;
          data.targetCarbs = calc.targetCarbs;
        }
      }

      const profile = storage.upsertUserProfile(userId, data);
      res.json({ profile });
    } catch (e) {
      next(e);
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Phase 20 — Dietary Restrictions
  // ════════════════════════════════════════════════════════════════════

  /** GET /api/user/dietary-restrictions */
  app.get("/api/user/dietary-restrictions", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const profile = storage.getUserProfile(req.user!.id);
      const raw = profile?.dietaryRestrictions;
      let parsed: string[] = [];
      try {
        parsed = raw ? JSON.parse(raw) : [];
      } catch {
        parsed = [];
      }
      res.json({ restrictions: parsed });
    } catch (e) {
      next(e);
    }
  });

  /** PUT /api/user/dietary-restrictions */
  app.put("/api/user/dietary-restrictions", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { restrictions } = req.body;
      if (!Array.isArray(restrictions)) throw ApiError.badRequest("restrictions must be array");
      const json = JSON.stringify(restrictions.map(String).slice(0, 50));
      const profile = storage.upsertDietaryRestrictions(req.user!.id, json);
      res.json({ profile });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/user/my-doctor */
  app.get("/api/user/my-doctor", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const doctor = storage.getPatientDoctor(req.user!.id);
      res.json({ doctor: doctor ?? null });
    } catch (e) {
      next(e);
    }
  });

  // ── MFA (Phase 28.2) ────────────────────────────────────────────────────────

  /**
   * POST /api/auth/mfa/setup
   * Generates a new TOTP secret and returns QR code data URL.
   * Does NOT enable MFA yet — call /mfa/verify-setup with a valid code first.
   * Only doctor/admin roles can enable MFA.
   */
  app.post("/api/auth/mfa/setup", requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const user = req.user!;
      if (user.role === "user") throw ApiError.forbidden("MFA доступна только для врачей и администраторов");
      const { packedSecret, qrDataUrl, uri } = await generateMfaSetup(user.username);
      // Store secret temporarily (not yet activated)
      storage.setMfaSecret(user.id, packedSecret);
      res.json({ qrDataUrl, uri, mfaEnabled: user.mfaEnabled });
    } catch (e) {
      next(e);
    }
  });

  /**
   * POST /api/auth/mfa/verify-setup
   * Verifies the first TOTP code after scanning QR. Activates MFA on success.
   * Body: { token: "123456" }
   */
  app.post("/api/auth/mfa/verify-setup", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const user = req.user!;
      const { token } = req.body as { token?: string };
      if (!token) throw ApiError.badRequest("Поле token обязательно");
      if (!user.mfaSecret) throw ApiError.badRequest("Сначала вызовите /mfa/setup");
      if (!verifyMfaToken(user.mfaSecret, token)) {
        throw ApiError.badRequest("Неверный код. Проверьте время на устройстве и повторите");
      }
      storage.enableMfa(user.id);
      res.json({ ok: true, mfaEnabled: true });
    } catch (e) {
      next(e);
    }
  });

  /**
   * POST /api/auth/mfa/disable
   * Disables MFA. Requires current TOTP code for confirmation.
   * Body: { token: "123456" }
   */
  app.post("/api/auth/mfa/disable", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const user = req.user!;
      const { token } = req.body as { token?: string };
      if (!token) throw ApiError.badRequest("Поле token обязательно");
      if (!user.mfaEnabled || !user.mfaSecret) throw ApiError.badRequest("MFA не включена");
      if (!verifyMfaToken(user.mfaSecret, token)) {
        throw ApiError.badRequest("Неверный код MFA");
      }
      storage.disableMfa(user.id);
      res.json({ ok: true, mfaEnabled: false });
    } catch (e) {
      next(e);
    }
  });

  /**
   * GET /api/auth/mfa/status
   * Returns current MFA status for the authenticated user.
   */
  app.get("/api/auth/mfa/status", requireAuth, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const user = req.user!;
      res.json({ mfaEnabled: user.mfaEnabled, canEnable: user.role !== "user" });
    } catch (e) {
      next(e);
    }
  });
}
