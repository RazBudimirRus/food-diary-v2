import type { Express } from "express";
import type { Server } from "http";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { storage, getMskDate, getMskTime } from "./storage";
import { generateDayReport } from "./excel";
import { addMealSchema, daySummarySchema, registerSchema, loginSchema, analyzeSchema, updateMealSchema, type InsertMeal } from "@shared/schema";
import {
  hashPassword, verifyPassword, signToken,
  requireAuth, requireAdmin, encryptSecret, decryptSecret,
  refreshCookieOptions, clearRefreshCookieOptions, clearLegacyAuthCookieOptions,
  generateRefreshToken, hashToken, getRefreshExpiresAt, getRefreshCookieName,
  type AuthRequest,
} from "./auth";
import { analyzeNutrition, isDeepSeekAvailable } from "./deepseek";
import { getClientIp } from "./client-ip";

export function registerRoutes(httpServer: Server, app: Express) {
  app.use(cookieParser());

  const refreshCookieName = getRefreshCookieName();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
    message: { error: "Слишком много попыток входа. Попробуйте позже." },
  });
  const mealCreateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req: AuthRequest) => req.user
      ? `user:${req.user.id}`
      : `ip:${ipKeyGenerator(getClientIp(req))}`,
    message: { error: "Слишком много запросов. Попробуйте позже." },
  });

  function publicUser(user: { id: number; username: string; email: string; displayName?: string | null; role: "user" | "admin" }) {
    return { id: user.id, username: user.username, email: user.email, displayName: user.displayName, role: user.role };
  }

  function paramValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value ?? "";
  }

  function issueSession(req: AuthRequest, res: any, user: { id: number; username: string; email: string; displayName?: string | null; role: "user" | "admin" }) {
    const rawRefreshToken = generateRefreshToken();
    const expiresAt = getRefreshExpiresAt();

    storage.createRefreshToken({
      token: hashToken(rawRefreshToken),
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      userAgent: req.get("user-agent") ?? null,
      ip: getClientIp(req),
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

    if (storage.getUserByUsername(username)) return res.status(409).json({ error: "Пользователь с таким именем уже существует" });
    if (storage.getUserByEmail(email)) return res.status(409).json({ error: "Email уже зарегистрирован" });

    const passwordHash = await hashPassword(password);
    const user = storage.createUser({ username, email, passwordHash, displayName });

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
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/meals/:id", requireAuth, (req: AuthRequest, res) => {
    try {
      const meal = storage.getMeal(Number(req.params.id));
      if (!meal) return res.status(404).json({ error: "Not found" });
      if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
      storage.deleteMeal(meal.id);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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

      const result = await analyzeNutrition(parsed.data.foodText, parsed.data.drinkText);
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

  // ── Misc ─────────────────────────────────────────────────────────────

  app.get("/api/now", (_req, res) => {
    res.json({ date: getMskDate(), time: getMskTime() });
  });
}
