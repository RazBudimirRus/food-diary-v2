import type { Express } from "express";
import { storage, getMskDate } from "../storage";
import { addMealSchema, daySummarySchema, analyzeSchema, updateMealSchema, type InsertMeal } from "@shared/schema";
import { requireAuth, type AuthRequest } from "../auth";
import { analyzeNutrition, isDeepSeekAvailable } from "../deepseek";
import { mealCreateLimiter } from "./limiters";
import { paramValue, isDateString, daysBetween, deepseekDailyLimitStatus } from "./helpers";
import { mealWaterMl } from "../utils/liquid";

export function registerMealsRoutes(app: Express) {
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
      // Phase 26.7: Idempotency — replay cached response if key already used
      const iKey = req.headers["idempotency-key"] as string | undefined;
      if (iKey) {
        const cached = storage.getIdempotencyKey(iKey, req.user!.id);
        if (cached) {
          return res.status(cached.status).json(JSON.parse(cached.body));
        }
      }

      const parsed = addMealSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const data = parsed.data;
      const date = data.date ?? getMskDate();
      const day = storage.getOrCreateDay(req.user!.id, date);

      const waterUnits = data.waterUnits ? Number(data.waterUnits) : null;
      const meal = storage.addMeal({
        dayId: day.id,
        userId: req.user!.id,
        tsStart: data.tsStart,
        tsEnd: data.tsEnd || data.tsStart,
        mealType: data.mealType,
        foodText: data.foodText || null,
        drinkText: data.drinkText || null,
        waterUnits,
        waterMl: mealWaterMl(waterUnits, data.drinkText),
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
      const responseBody = { meal, day };
      // Phase 26.7: Save idempotency key after successful creation
      if (iKey) {
        storage.saveIdempotencyKey(iKey, req.user!.id, 200, JSON.stringify(responseBody));
      }
      res.json(responseBody);
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

  // Phase 31.1: Restore soft-deleted meal within undo window
  app.post("/api/meals/:id/restore", requireAuth, (req: AuthRequest, res) => {
    try {
      const meal = storage.getMeal(Number(req.params.id));
      if (!meal) return res.status(404).json({ error: "Not found" });
      if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
      if (!meal.deletedAt) return res.status(400).json({ error: "Запись не удалена" });
      // Allow restore only within 60 seconds
      const deletedMs = new Date(meal.deletedAt).getTime();
      if (Date.now() - deletedMs > 60_000) {
        return res.status(410).json({ error: "Окно восстановления истекло" });
      }
      storage.restoreMeal(meal.id);
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
      // BUG-02: recompute waterMl whenever drinkText or waterUnits changes
      if (data.drinkText !== undefined || data.waterUnits !== undefined) {
        const effectiveWaterUnits = update.waterUnits ?? meal.waterUnits ?? null;
        const effectiveDrinkText = update.drinkText ?? meal.drinkText ?? null;
        update.waterMl = mealWaterMl(effectiveWaterUnits, effectiveDrinkText);
      }
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
      const dietaryRestrictions = userProfile?.dietaryRestrictions ?? null;
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
      // ADMIN-2: логируем DeepSeek ошибки в client_errors
      try {
        storage.addClientError({
          userId: req.user?.id ?? null,
          message: `[deepseek] ${e.message}`,
          stack: e.stack ?? null,
          url: "POST /api/analyze",
          userAgent: req.headers["user-agent"] ?? null,
          extra: null,
        });
      } catch {
        /* ignore */
      }
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/meals/:id/analyze-kbju
   * UX-18: AI-анализ КБЖУ для приёма пищи с фото.
   * Использует DeepSeek для расчёта КБЖУ по тексту записи (foodText/drinkText).
   * Если у записи нет текста, возвращает 400.
   * Сохраняет результат в meal.calories/protein/fat/carbs.
   */
  app.post("/api/meals/:id/analyze-kbju", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!isDeepSeekAvailable()) {
        return res.status(503).json({ error: "DeepSeek API не настроен" });
      }
      const mealId = parseInt(paramValue(req.params.id), 10);
      if (isNaN(mealId)) return res.status(400).json({ error: "Некорректный id" });

      const meal = storage.getMeal(mealId);
      if (!meal) return res.status(404).json({ error: "Запись не найдена" });
      if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });

      if (!meal.foodText && !meal.drinkText) {
        return res.status(400).json({ error: "Нет описания блюда для анализа. Добавьте текст к записи." });
      }

      const limitStatus = deepseekDailyLimitStatus();
      if (limitStatus.dailyLimitExceeded) {
        return res.status(429).json({ error: "Превышен дневной лимит DeepSeek", ...limitStatus });
      }

      const userProfile = storage.getUserProfile(req.user!.id);
      const dietaryRestrictions = userProfile?.dietaryRestrictions ?? null;
      const result = await analyzeNutrition(
        meal.foodText ?? undefined,
        meal.drinkText ?? undefined,
        dietaryRestrictions,
      );

      if (result.usage) {
        storage.recordApiUsage({
          userId: req.user!.id,
          endpoint: "deepseek",
          tokensIn: result.usage.tokensIn,
          tokensOut: result.usage.tokensOut,
          costEstimate: result.usage.costEstimate,
        });
      }

      const updated = storage.updateMeal(mealId, {
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
      });

      res.json({ meal: updated, note: result.note });
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

  /** GET /api/meals/:id/notes */
  app.get("/api/meals/:id/notes", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(paramValue(req.params.id), 10);
    const notes = storage.getDoctorMealNotes(mealId);
    res.json({ notes });
  });

  /** GET /api/meals/:id/photos */
  app.get("/api/meals/:id/photos", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(paramValue(req.params.id), 10);
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
}
