import type { Express } from "express";
import type { Server } from "http";
import cookieParser from "cookie-parser";
import { storage, getMskDate, getMskTime } from "./storage";
import { generateDayReport } from "./excel";
import { addMealSchema, daySummarySchema, registerSchema, loginSchema } from "@shared/schema";
import {
  hashPassword, verifyPassword, signToken,
  requireAuth, encryptSecret, decryptSecret,
  type AuthRequest,
} from "./auth";

export function registerRoutes(httpServer: Server, app: Express) {
  app.use(cookieParser());

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
    const token = signToken({ userId: user.id, username: user.username });

    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName } });
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { username, password } = parsed.data;
    const user = storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Неверный логин или пароль" });

    const token = signToken({ userId: user.id, username: user.username });
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName } });
  });

  /** POST /api/auth/logout */
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ ok: true });
  });

  /** GET /api/auth/me */
  app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => {
    const u = req.user!;
    res.json({ id: u.id, username: u.username, email: u.email, displayName: u.displayName });
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
    const secret = storage.setSecret(req.user!.id, req.params.key, encryptedValue, iv);
    res.json({ key: secret.key, updatedAt: secret.updatedAt });
  });

  /** GET /api/secrets/:key/value — decrypt and return a single secret value */
  app.get("/api/secrets/:key/value", requireAuth, (req: AuthRequest, res) => {
    const s = storage.getSecret(req.user!.id, req.params.key);
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
      const day = storage.getOrCreateDay(req.user!.id, req.params.date);
      const mealsData = storage.getMealsByDay(day.id);
      res.json({ day, meals: mealsData });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/days/:id/summary", requireAuth, (req: AuthRequest, res) => {
    try {
      const parsed = daySummarySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const day = storage.updateDaySummary(Number(req.params.id), parsed.data);
      res.json({ day });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Meals ──────────────────────────────────────────────────────────────────

  app.post("/api/meals", requireAuth, (req: AuthRequest, res) => {
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
      const updated = storage.updateMeal(meal.id, req.body);
      res.json({ meal: updated });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Report ─────────────────────────────────────────────────────────────────

  app.get("/api/report/:date", requireAuth, async (req: AuthRequest, res) => {
    try {
      const day = storage.getDayByDate(req.user!.id, req.params.date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      if (!day.summaryFilled && req.query.force !== "1") {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const mealsData = storage.getMealsByDay(day.id);
      const buf = await generateDayReport(day, mealsData);
      const filename = `Дневник_питания_${req.params.date}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Misc ───────────────────────────────────────────────────────────────────

  app.get("/api/now", (_req, res) => {
    res.json({ date: getMskDate(), time: getMskTime() });
  });
}
