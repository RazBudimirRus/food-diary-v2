import type { Express } from "express";
import type { Server } from "http";
import { storage, getMskDate, getMskTime } from "./storage";
import { generateDayReport } from "./excel";
import { addMealSchema, daySummarySchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express) {

  // ── Helper: get or create day ─────────────────────────────────────────────

  function getDayAndUser(userId: number, date: string) {
    const day = storage.getOrCreateDay(userId, date);
    return day;
  }

  // ── Web user (single-user mode) ───────────────────────────────────────────

  /** GET /api/days/:date */
  app.get("/api/days/:date", (_req, res) => {
    try {
      const user = storage.ensureWebUser();
      const date = _req.params.date;
      const day = storage.getOrCreateDay(user.id, date);
      const meals = storage.getMealsByDay(day.id);
      res.json({ day, meals });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/days/today */
  app.get("/api/days/today", (_req, res) => {
    try {
      const user = storage.ensureWebUser();
      const date = getMskDate();
      const day = storage.getOrCreateDay(user.id, date);
      const meals = storage.getMealsByDay(day.id);
      res.json({ day, meals });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/meals */
  app.post("/api/meals", (req, res) => {
    try {
      const user = storage.ensureWebUser();
      const parsed = addMealSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const data = parsed.data;
      const date = data.date ?? getMskDate();
      const day = storage.getOrCreateDay(user.id, date);

      const meal = storage.addMeal({
        dayId: day.id,
        userId: user.id,
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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/meals/:id */
  app.delete("/api/meals/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const meal = storage.getMeal(id);
      if (!meal) return res.status(404).json({ error: "Not found" });
      storage.deleteMeal(id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** PATCH /api/meals/:id */
  app.patch("/api/meals/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const meal = storage.getMeal(id);
      if (!meal) return res.status(404).json({ error: "Not found" });
      const updated = storage.updateMeal(id, req.body);
      res.json({ meal: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/days/:id/summary */
  app.post("/api/days/:id/summary", (req, res) => {
    try {
      const dayId = Number(req.params.id);
      const parsed = daySummarySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const day = storage.updateDaySummary(dayId, parsed.data);
      res.json({ day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Report (web user) ──────────────────────────────────────────────────────

  app.get("/api/report/:date", async (req, res) => {
    try {
      const user = storage.ensureWebUser();
      const date = req.params.date;
      const day = storage.getDayByDate(user.id, date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      const force = req.query.force === "1";
      if (!day.summaryFilled && !force) {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const meals = storage.getMealsByDay(day.id);
      const buf = await generateDayReport(day, meals);
      const filename = `Дневник_питания_${date}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Telegram bot API routes ───────────────────────────────────────────────
  // Bot talks to these endpoints using /api/tg/:tg_user_id/...

  /** GET /api/tg/users/:tg_user_id */
  app.get("/api/tg/users/:tgId", (req, res) => {
    try {
      const u = storage.getUserByTgId(req.params.tgId);
      if (!u) return res.status(404).json({ error: "Not found" });
      res.json(u);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/tg/users — register TG user */
  app.post("/api/tg/users", (req, res) => {
    try {
      const { tg_user_id, tg_username } = req.body;
      const existing = storage.getUserByTgId(tg_user_id);
      if (existing) return res.json(existing);
      const u = storage.createUser({ tgUserId: tg_user_id, tgUsername: tg_username, webToken: null });
      res.json(u);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/tg/:tgId/days/:date */
  app.get("/api/tg/:tgId/days/:date", (req, res) => {
    try {
      const user = storage.getUserByTgId(req.params.tgId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const day = storage.getOrCreateDay(user.id, req.params.date);
      const meals = storage.getMealsByDay(day.id);
      res.json({ day, meals });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/tg/:tgId/meals */
  app.post("/api/tg/:tgId/meals", (req, res) => {
    try {
      const user = storage.getUserByTgId(req.params.tgId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const parsed = addMealSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const data = parsed.data;
      const date = data.date ?? getMskDate();
      const day = storage.getOrCreateDay(user.id, date);

      const meal = storage.addMeal({
        dayId: day.id,
        userId: user.id,
        tsStart: data.tsStart,
        tsEnd: data.tsEnd || data.tsStart,
        mealType: data.mealType,
        foodText: data.foodText || null,
        drinkText: data.drinkText || null,
        waterUnits: data.waterUnits ? Number(data.waterUnits) : null,
        hungerBefore: data.hungerBefore != null ? Number(data.hungerBefore) : null,
        satietyAfter: data.satietyAfter != null ? Number(data.satietyAfter) : null,
        contextNote: data.contextNote || null,
        source: "telegram",
        rawInput: data.rawInput || null,
      });

      res.json({ meal, day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/tg/:tgId/days/:date/summary */
  app.post("/api/tg/:tgId/days/:date/summary", (req, res) => {
    try {
      const user = storage.getUserByTgId(req.params.tgId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const day = storage.getOrCreateDay(user.id, req.params.date);
      const parsed = daySummarySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const updated = storage.updateDaySummary(day.id, parsed.data);
      res.json({ day: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/tg/:tgId/report/:date */
  app.get("/api/tg/:tgId/report/:date", async (req, res) => {
    try {
      const user = storage.getUserByTgId(req.params.tgId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const day = storage.getDayByDate(user.id, req.params.date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      const force = req.query.force === "1";
      if (!day.summaryFilled && !force) {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const meals = storage.getMealsByDay(day.id);
      const buf = await generateDayReport(day, meals);
      const filename = `Дневник_питания_${req.params.date}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Misc ──────────────────────────────────────────────────────────────────

  app.get("/api/now", (_req, res) => {
    res.json({ date: getMskDate(), time: getMskTime() });
  });
}
