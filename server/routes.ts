import type { Express } from "express";
import type { Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { storage, getMskDate, getMskTime } from "./storage";
import { generateDayReport, generateRangeReport } from "./excel";
import {
  addMealSchema,
  daySummarySchema,
  registerSchema,
  loginSchema,
  analyzeSchema,
  updateMealSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  upsertUserProfileSchema,
  insertDoctorPlanSchema,
  createCatalogItemSchema,
  type InsertMeal,
} from "@shared/schema";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  requireAdmin,
  encryptSecret,
  decryptSecret,
  refreshCookieOptions,
  clearRefreshCookieOptions,
  clearLegacyAuthCookieOptions,
  generateRefreshToken,
  hashToken,
  getRefreshExpiresAt,
  getRefreshCookieName,
  type AuthRequest,
} from "./auth";
import { analyzeNutrition, isDeepSeekAvailable } from "./deepseek";
import { isSmtpConfigured, sendPasswordResetEmail } from "./mail";
import multer from "multer";
import { randomUUID } from "crypto";
import {
  uploadPhoto,
  downloadPhoto,
  deleteFromS3,
  buildPhotoKey,
  isS3Configured,
  PHOTO_MAX_SIZE_BYTES,
  PHOTO_MAX_PER_USER,
} from "./s3";
import webpush from "web-push";

// ── Doctor role middleware ──────────────────────────────────────────────────
function requireDoctor(req: AuthRequest, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: "Не авторизован" });
  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Доступ только для врачей" });
  }
  next();
}

// ── Multer (memory storage — файл передаётся в S3, на диск не сохраняем) ────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Только изображения") as any, false);
    }
    cb(null, true);
  },
});

// ── VAPID init (Web Push) ────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@fooddiary.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export function registerRoutes(httpServer: Server, app: Express) {
  app.use(cookieParser());

  const refreshCookieName = getRefreshCookieName();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Слишком много попыток входа. Попробуйте позже." },
  });
  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket.remoteAddress || "0.0.0.0"),
    message: { error: "Слишком много запросов на сброс пароля. Попробуйте позже." },
  });
  const mealCreateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req: AuthRequest) =>
      req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || "0.0.0.0")}`,
    message: { error: "Слишком много запросов. Попробуйте позже." },
  });

  function publicUser(user: {
    id: number;
    username: string;
    email: string;
    displayName?: string | null;
    role: "user" | "admin";
  }) {
    return { id: user.id, username: user.username, email: user.email, displayName: user.displayName, role: user.role };
  }

  function paramValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : (value ?? "");
  }

  function issueSession(
    req: AuthRequest,
    res: any,
    user: { id: number; username: string; email: string; displayName?: string | null; role: "user" | "admin" },
  ) {
    const rawRefreshToken = generateRefreshToken();
    const expiresAt = getRefreshExpiresAt();

    storage.createRefreshToken({
      token: hashToken(rawRefreshToken),
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      userAgent: req.get("user-agent") ?? null,
      ip: req.ip ?? null,
    });

    res.cookie(refreshCookieName, rawRefreshToken, refreshCookieOptions());
    res.clearCookie("token", clearLegacyAuthCookieOptions());

    return {
      accessToken: signToken({ userId: user.id, username: user.username, role: user.role }),
      user: publicUser(user),
    };
  }

  function generateTemporaryPassword(): string {
    return crypto.randomBytes(9).toString("base64url");
  }

  function passwordResetExpiresAt(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  const forgotPasswordResponse = {
    ok: true,
    message: "Если email зарегистрирован, мы отправили ссылку для сброса пароля.",
  };

  function readPositiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function isDateString(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function daysBetween(fromDate: string, toDate: string): number {
    const from = new Date(`${fromDate}T00:00:00Z`).getTime();
    const to = new Date(`${toDate}T00:00:00Z`).getTime();
    return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
  }

  function deepseekDailyLimitStatus(now = new Date()) {
    const dailyTokenLimit = readPositiveNumber(process.env.DEEPSEEK_DAILY_TOKEN_LIMIT, 0);
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const todaySummary = storage.getApiUsageSummary(todayStart.toISOString(), tomorrowStart.toISOString());
    const todayTokens = todaySummary.totalTokens;

    return {
      dailyTokenLimit,
      todayTokens,
      dailyLimitExceeded: dailyTokenLimit > 0 && todayTokens >= dailyTokenLimit,
    };
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

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
    res.json(publicUser(u));
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
      const resetUrl = `${publicUrl}/#/reset-password?token=${rawToken}`;

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

  // ── Days ───────────────────────────────────────────────────────────────────

  app.get("/api/days/:date", requireAuth, (req: AuthRequest, res) => {
    try {
      const day = storage.getOrCreateDay(req.user!.id, paramValue(req.params.date));
      const mealsData = storage.getMealsByDay(day.id);
      res.json({ day, meals: mealsData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/days/:id/summary", requireAuth, (req: AuthRequest, res) => {
    try {
      const parsed = daySummarySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const existingDay = storage.getDayById(Number(req.params.id));
      if (!existingDay) return res.status(404).json({ error: "День не найден" });
      if (existingDay.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });

      const day = storage.updateDaySummary(existingDay.id, parsed.data);
      res.json({ day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Meals ──────────────────────────────────────────────────────────────────

  app.post("/api/meals", requireAuth, mealCreateLimiter, (req: AuthRequest, res) => {
    try {
      const parsed = addMealSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const data = parsed.data;
      const date = data.date ?? getMskDate();
      const day = storage.getOrCreateDay(req.user!.id, date);

      const meal = storage.addMeal({
        dayId: day.id,
        userId: req.user!.id,
        tsStart: data.tsStart,
        tsEnd: data.tsEnd || data.tsStart,
        mealType: data.mealType,
        foodText: data.foodText || null,
        drinkText: data.drinkText || null,
        waterUnits: data.waterUnits ? Number(data.waterUnits) : null,
        hungerBefore: data.hungerBefore != null ? Number(data.hungerBefore) : null,
        satietyAfter: data.satietyAfter != null ? Number(data.satietyAfter) : null,
        contextNote: data.contextNote || null,
        source: "web",
        rawInput: data.rawInput || null,
        calories: data.calories ?? null,
        protein: data.protein ?? null,
        fat: data.fat ?? null,
        carbs: data.carbs ?? null,
      });
      res.json({ meal, day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/meals/:id", requireAuth, (req: AuthRequest, res) => {
    try {
      const meal = storage.getMeal(Number(req.params.id));
      if (!meal) return res.status(404).json({ error: "Not found" });
      if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
      storage.deleteMeal(meal.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/meals/:id", requireAuth, (req: AuthRequest, res) => {
    try {
      const meal = storage.getMeal(Number(req.params.id));
      if (!meal) return res.status(404).json({ error: "Not found" });
      if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
      const parsed = updateMealSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const data = parsed.data;
      const update: Partial<InsertMeal> = {};
      if (data.tsStart !== undefined) update.tsStart = data.tsStart;
      if (data.tsEnd !== undefined) update.tsEnd = data.tsEnd || data.tsStart || meal.tsStart;
      if (data.mealType !== undefined) update.mealType = data.mealType;
      if (data.foodText !== undefined) update.foodText = data.foodText || null;
      if (data.drinkText !== undefined) update.drinkText = data.drinkText || null;
      if (data.waterUnits !== undefined) update.waterUnits = data.waterUnits === "" ? null : Number(data.waterUnits);
      if (data.hungerBefore !== undefined) update.hungerBefore = Number(data.hungerBefore);
      if (data.satietyAfter !== undefined) update.satietyAfter = Number(data.satietyAfter);
      if (data.contextNote !== undefined) update.contextNote = data.contextNote || null;
      if (data.rawInput !== undefined) update.rawInput = data.rawInput || null;
      if (data.calories !== undefined) update.calories = data.calories;
      if (data.protein !== undefined) update.protein = data.protein;
      if (data.fat !== undefined) update.fat = data.fat;
      if (data.carbs !== undefined) update.carbs = data.carbs;

      if (data.date !== undefined) {
        const currentDay = storage.getDayById(meal.dayId);
        const targetDay = storage.getOrCreateDay(req.user!.id, data.date);
        if (!currentDay || targetDay.id !== meal.dayId) {
          update.dayId = targetDay.id;
        }
      }

      const updated = storage.updateMeal(meal.id, update);
      const targetDay = storage.getDayById(updated!.dayId);
      res.json({
        meal: updated,
        previousDate: storage.getDayById(meal.dayId)?.date,
        day: targetDay,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Report ─────────────────────────────────────────────────────────────────

  app.get("/api/report/:date", requireAuth, async (req: AuthRequest, res) => {
    try {
      const date = paramValue(req.params.date);
      const day = storage.getDayByDate(req.user!.id, date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      if (!day.summaryFilled && req.query.force !== "1") {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const mealsData = storage.getMealsByDay(day.id);
      const buf = await generateDayReport(day, mealsData);
      const filename = `Дневник_питания_${date}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── DeepSeek КБЖУ ─────────────────────────────────────────────────────────────

  /** GET /api/analyze/available — проверяем наличие ключа */
  app.get("/api/analyze/available", requireAuth, (_req, res) => {
    res.json({ available: isDeepSeekAvailable() });
  });

  /** POST /api/analyze — анализ еды/напитков через DeepSeek */
  app.post("/api/analyze", requireAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = analyzeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const limitStatus = deepseekDailyLimitStatus();
      if (limitStatus.dailyLimitExceeded) {
        return res.status(429).json({
          error: "DeepSeek daily token limit exceeded",
          ...limitStatus,
        });
      }

      // Phase 20: get user dietary restrictions
      const userProfile = storage.getUserProfile(req.user!.id);
      const dietaryRestrictions = (userProfile as any)?.dietaryRestrictions ?? null;
      const result = await analyzeNutrition(parsed.data.foodText, parsed.data.drinkText, dietaryRestrictions);
      if (result.usage) {
        storage.recordApiUsage({
          userId: req.user!.id,
          endpoint: "deepseek",
          tokensIn: result.usage.tokensIn,
          tokensOut: result.usage.tokensOut,
          costEstimate: result.usage.costEstimate,
        });
      }
      const { usage: _usage, ...nutrition } = result;
      res.json(nutrition);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Analytics ───────────────────────────────────────────────────────────────

  app.get("/api/analytics/summary", requireAuth, (req: AuthRequest, res) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!isDateString(from) || !isDateString(to)) {
      return res.status(400).json({ error: "from and to must be YYYY-MM-DD" });
    }
    const periodDays = daysBetween(from, to);
    if (periodDays <= 0 || periodDays > 366) {
      return res.status(400).json({ error: "date range must be 1..366 days" });
    }

    res.json(storage.getNutritionAnalytics(req.user!.id, from, to));
  });

  // ── Admin ──────────────────────────────────────────────────────────────────

  app.get("/api/admin/users", requireAuth, requireAdmin, (_req: AuthRequest, res) => {
    const users = storage.listUsers().map(publicUser);
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
    res.json({ user: publicUser(user), temporaryPassword });
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

  // ── Phase 21: Расширенные отчёты ────────────────────────────────────────────

  /**
   * GET /api/report/range?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Multi-day Excel report (Phase 21)
   */
  app.get("/api/report/range", requireAuth, async (req: AuthRequest, res) => {
    try {
      const from = paramValue(req.query.from as string);
      const to = paramValue(req.query.to as string);
      if (!isDateString(from) || !isDateString(to)) {
        return res.status(400).json({ error: "Некорректные даты. Формат: YYYY-MM-DD" });
      }
      if (from > to) return res.status(400).json({ error: "Дата начала позже даты окончания" });
      const maxDays = 90;
      if (daysBetween(from, to) > maxDays) {
        return res.status(400).json({ error: `Максимальный период для отчёта — ${maxDays} дней` });
      }

      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный период записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateRangeReport(days, mealsByDayId);
      const filename = `Дневник_питания_${from}_${to}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
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
    const raw = (profile as any)?.dietaryRestrictions;
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

  // ════════════════════════════════════════════════════════════════════
  // Phase 15 — Doctor Cabinet
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/admin/users/:id/set-role (admin only) */
  app.post("/api/admin/users/:id/set-role", requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!["user", "doctor", "admin"].includes(role)) {
      return res.status(400).json({ error: "Допустимые роли: user, doctor, admin" });
    }
    const updated = storage.setUserRole(userId, role);
    if (!updated) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ user: updated });
  });

  /** GET /api/doctor/profile */
  app.get("/api/doctor/profile", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const doctor = storage.getDoctorByUserId(req.user!.id);
    res.json({ doctor: doctor ?? null });
  });

  /** PUT /api/doctor/profile */
  app.put("/api/doctor/profile", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const { fullName, phone, telegramUrl } = req.body;
    if (!fullName) return res.status(400).json({ error: "fullName обязателен" });
    const doctor = storage.upsertDoctor(req.user!.id, { fullName, phone, telegramUrl });
    res.json({ doctor });
  });

  /** GET /api/doctor/patients */
  app.get("/api/doctor/patients", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.json({ patients: [] });
    const patients = storage.getDoctorPatients(doctor.id);
    res.json({ patients });
  });

  /** GET /api/doctor/search-users?q=... */
  app.get("/api/doctor/search-users", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const q = ((req.query.q as string) || "").trim();
    if (q.length < 2) return res.json({ users: [] });
    const results = storage.searchUsers(q, 10);
    // Return only safe fields
    const safe = results.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName }));
    res.json({ users: safe });
  });

  /** POST /api/doctor/patients/:id/assign */
  app.post("/api/doctor/patients/:id/assign", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const patientId = parseInt(req.params.id, 10);
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor)
      return res.status(400).json({ error: "Сначала заполните профиль врача — перейдите на вкладку Профиль" });
    if (patientId === req.user!.id) return res.status(400).json({ error: "Нельзя добавить себя в качестве пациента" });
    const patient = storage.getUserById(patientId);
    if (!patient) return res.status(404).json({ error: "Пользователь не найден в системе" });
    if (patient.role === "admin")
      return res.status(400).json({ error: "Нельзя добавить администратора в качестве пациента" });
    try {
      const dp = storage.assignPatient(doctor.id, patientId);
      res.json({ doctorPatient: dp });
    } catch (e: any) {
      res.status(409).json({ error: "Этот пациент уже привязан к вам" });
    }
  });

  /** DELETE /api/doctor/patients/:id */
  app.delete("/api/doctor/patients/:id", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const patientId = parseInt(req.params.id, 10);
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.status(404).json({ error: "Врач не найден" });
    storage.removePatient(doctor.id, patientId);
    res.json({ ok: true });
  });

  /** GET /api/doctor/patients/:id/diary?date=YYYY-MM-DD */
  app.get("/api/doctor/patients/:id/diary", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const patientId = parseInt(req.params.id, 10);
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.status(403).json({ error: "Врач не найден" });

    // Verify patient is assigned
    const patients = storage.getDoctorPatients(doctor.id);
    const assigned = patients.some((p) => p.user.id === patientId);
    if (!assigned) return res.status(403).json({ error: "Пациент не привязан к вам" });

    const date = (req.query.date as string) || getMskDate();
    const day = storage.getDayByDate(patientId, date);
    if (!day) return res.json({ day: null, meals: [] });
    const meals = storage.getMealsByDay(day.id);
    res.json({ day, meals });
  });

  /** POST /api/doctor/patients/:id/notify (Web Push) */
  app.post("/api/doctor/patients/:id/notify", requireAuth, requireDoctor, async (req: AuthRequest, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res.status(503).json({ error: "Web Push не настроен" });
    }
    const patientId = parseInt(req.params.id, 10);
    const { title, body } = req.body;
    if (!title) return res.status(400).json({ error: "title обязателен" });

    const subs = storage.getUserPushSubscriptions(patientId);
    if (!subs.length) return res.json({ sent: 0 });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body: body || "" }),
        );
        sent++;
      } catch {
        storage.deletePushSubscription(sub.endpoint);
      }
    }
    res.json({ sent });
  });

  /** POST /api/push/subscribe */
  app.post("/api/push/subscribe", requireAuth, (req: AuthRequest, res) => {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "endpoint, p256dh, auth обязательны" });
    const sub = storage.savePushSubscription({ userId: req.user!.id, endpoint, p256dh, auth });
    res.json({ sub });
  });

  /** GET /api/push/vapid-public-key */
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
  });

  /** GET /api/user/my-doctor */
  app.get("/api/user/my-doctor", requireAuth, (req: AuthRequest, res) => {
    const doctor = storage.getPatientDoctor(req.user!.id);
    res.json({ doctor: doctor ?? null });
  });

  /** POST /api/doctor/meals/:mealId/notes */
  app.post("/api/doctor/meals/:mealId/notes", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const mealId = parseInt(req.params.mealId, 10);
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.status(400).json({ error: "Профиль врача не найден" });
    const { note, suggestedKcal } = req.body;
    const result = storage.addDoctorMealNote({ doctorId: doctor.id, mealId, note, suggestedKcal });
    res.json({ note: result });
  });

  /** GET /api/meals/:id/notes */
  app.get("/api/meals/:id/notes", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(req.params.id, 10);
    const notes = storage.getDoctorMealNotes(mealId);
    res.json({ notes });
  });

  // ════════════════════════════════════════════════════════════════════
  // Phase 18 — Doctor КБЖУ Plans
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/doctor/patients/:id/plans */
  app.post("/api/doctor/patients/:id/plans", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const patientId = parseInt(req.params.id, 10);
    const doctor = storage.getDoctorByUserId(req.user!.id);
    if (!doctor) return res.status(400).json({ error: "Профиль врача не найден" });
    const parsed = insertDoctorPlanSchema.safeParse({ ...req.body, patientId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const plan = storage.createDoctorPlan(doctor.id, parsed.data);
    res.json({ plan });
  });

  /** GET /api/doctor/patients/:id/plans */
  app.get("/api/doctor/patients/:id/plans", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const patientId = parseInt(req.params.id, 10);
    const plans = storage.getDoctorPlansForPatient(patientId);
    res.json({ plans });
  });

  /** DELETE /api/doctor/plans/:id */
  app.delete("/api/doctor/plans/:id", requireAuth, requireDoctor, (req: AuthRequest, res) => {
    const planId = parseInt(req.params.id, 10);
    storage.deleteDoctorPlan(planId);
    res.json({ ok: true });
  });

  /** GET /api/user/active-plan */
  app.get("/api/user/active-plan", requireAuth, (req: AuthRequest, res) => {
    const date = (req.query.date as string) || getMskDate();
    const plan = storage.getActivePlan(req.user!.id, date);
    if (!plan) {
      // Fallback to user profile targets
      const profile = storage.getUserProfile(req.user!.id);
      if (!profile || (!profile.targetKcal && !profile.targetProtein)) {
        return res.json({ plan: null, source: "none" });
      }
      return res.json({
        plan: {
          kcal: profile.targetKcal,
          protein: profile.targetProtein,
          fat: profile.targetFat,
          carbs: profile.targetCarbs,
          waterMl: null,
          notes: null,
        },
        source: "profile",
      });
    }
    res.json({ plan, source: "doctor" });
  });

  // ════════════════════════════════════════════════════════════════════
  // UX-7 — Food Catalog
  // ════════════════════════════════════════════════════════════════════

  /** GET /api/catalog */
  app.get("/api/catalog", requireAuth, (req: AuthRequest, res) => {
    const items = storage.getCatalogItems(req.user!.id);
    res.json({ items });
  });

  /** POST /api/catalog */
  app.post("/api/catalog", requireAuth, (req: AuthRequest, res) => {
    const parsed = createCatalogItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = storage.createCatalogItem(req.user!.id, parsed.data);
    res.json({ item });
  });

  /** DELETE /api/catalog/:id */
  app.delete("/api/catalog/:id", requireAuth, (req: AuthRequest, res) => {
    const itemId = parseInt(req.params.id, 10);
    storage.deleteCatalogItem(req.user!.id, itemId);
    res.json({ ok: true });
  });

  /** POST /api/catalog/from-meal/:mealId */
  app.post("/api/catalog/from-meal/:mealId", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(req.params.mealId, 10);
    const meal = storage.getMeal(mealId);
    if (!meal) return res.status(404).json({ error: "Приём пищи не найден" });
    if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });
    const { name } = req.body;
    const item = storage.saveMealToCatalog(req.user!.id, mealId, name || meal.mealType);
    res.json({ item });
  });

  // ════════════════════════════════════════════════════════════════════
  // Phase 23 — S3 Photos
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/photos/upload */
  app.post("/api/photos/upload", requireAuth, upload.single("photo"), async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 хранилище не настроено" });
    if (!req.file) return res.status(400).json({ error: "Файл не передан" });

    // Проверяем лимит фотографий пользователя
    const count = storage.countUserPhotos(req.user!.id);
    if (count >= PHOTO_MAX_PER_USER) {
      return res.status(429).json({ error: `Достигнут лимит фотографий (${PHOTO_MAX_PER_USER})` });
    }

    const mealId = req.body.mealId ? parseInt(req.body.mealId, 10) : null;
    const photoId = randomUUID();
    const s3Key = buildPhotoKey(req.user!.id, photoId);

    try {
      const sizeBytes = await uploadPhoto(s3Key, req.file.buffer, req.file.mimetype);
      const photo = storage.savePhoto({ id: photoId, userId: req.user!.id, mealId, s3Key, sizeBytes });
      res.json({ photo });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/photos/:photo_id — proxy, no direct S3 URL */
  app.get("/api/photos/:photo_id", requireAuth, async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 не настроен" });
    const photo = storage.getPhoto(req.params.photo_id);
    if (!photo) return res.status(404).json({ error: "Фото не найдено" });
    if (photo.userId !== req.user!.id) {
      // Врач тоже может просматривать
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(403).json({ error: "Нет доступа" });
    }
    try {
      const buf = await downloadPhoto(photo.s3Key);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/photos/:photo_id */
  app.delete("/api/photos/:photo_id", requireAuth, async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 не настроен" });
    const photo = storage.getPhoto(req.params.photo_id);
    if (!photo) return res.status(404).json({ error: "Фото не найдено" });
    if (photo.userId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });
    try {
      await deleteFromS3(photo.s3Key);
      storage.deletePhoto(photo.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/meals/:id/photos */
  app.get("/api/meals/:id/photos", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(req.params.id, 10);
    const meal = storage.getMeal(mealId);
    if (!meal) return res.status(404).json({ error: "Приём пищи не найден" });
    // Доступ: пользователь или врач пациента
    if (meal.userId !== req.user!.id) {
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(403).json({ error: "Нет доступа" });
    }
    const photos = storage.getPhotosByMeal(mealId);
    res.json({ photos });
  });

  // ── Misc ─────────────────────────────────────────────────────────────

  app.get("/api/now", (_req, res) => {
    res.json({ date: getMskDate(), time: getMskTime() });
  });
}
