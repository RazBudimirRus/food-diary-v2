import type { Express, NextFunction } from "express";
import { storage } from "../storage";
import { createCatalogItemSchema } from "@shared/schema";
import { requireAuth, type AuthRequest } from "../auth";
import { paramValue } from "./helpers";
import { analyzeNutrition, isDeepSeekAvailable } from "../deepseek";
import { ApiError } from "../errors";

export function registerCatalogRoutes(app: Express) {
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
    if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());
    const item = storage.createCatalogItem(req.user!.id, parsed.data);
    res.json({ item });
  });

  /** PUT /api/catalog/:id — переименовать / изменить описание */
  app.put("/api/catalog/:id", requireAuth, (req: AuthRequest, res) => {
    const itemId = parseInt(paramValue(req.params.id), 10);
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) throw ApiError.badRequest("Название обязательно");
    const item = storage.updateCatalogItem(req.user!.id, itemId, { name: name.trim(), description });
    if (!item) throw ApiError.notFound("Шаблон не найден");
    res.json({ item });
  });

  /** DELETE /api/catalog/:id */
  app.delete("/api/catalog/:id", requireAuth, (req: AuthRequest, res) => {
    const itemId = parseInt(paramValue(req.params.id), 10);
    storage.deleteCatalogItem(req.user!.id, itemId);
    res.json({ ok: true });
  });

  // ── UX-21: calculate КБЖУ for catalog item via AI ─────────────────────────

  /** POST /api/catalog/:id/calculate-kbju */
  app.post("/api/catalog/:id/calculate-kbju", requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      if (!isDeepSeekAvailable()) {
        throw new ApiError(503, "AI-расчёт недоступен: DEEPSEEK_API_KEY не настроен", "service_unavailable");
      }
      const itemId = parseInt(paramValue(req.params.id), 10);
      const items = storage.getCatalogItems(req.user!.id);
      const item = items.find((it) => it.id === itemId);
      if (!item) throw ApiError.notFound("Позиция каталога не найдена");

      // Build text from entries mealName fields
      const foodText = item.entries.map((e) => e.mealName).join(", ");
      if (!foodText.trim()) {
        throw ApiError.badRequest("Нет текста для анализа");
      }

      const result = await analyzeNutrition(foodText);
      // Persist to the first entry
      const firstEntry = item.entries[0];
      if (firstEntry) {
        storage.updateCatalogEntryKbju(req.user!.id, firstEntry.id, {
          kcal: result.calories,
          protein: result.protein,
          fat: result.fat,
          carbs: result.carbs,
        });
      }
      res.json({ result, note: result.note });
    } catch (e: any) {
      try {
        storage.addClientError({
          userId: req.user?.id ?? null,
          message: `[deepseek/catalog] ${e.message}`,
          stack: e.stack ?? null,
          url: `POST /api/catalog/${req.params.id}/calculate-kbju`,
          userAgent: req.headers["user-agent"] ?? null,
          extra: null,
        });
      } catch {
        /* ignore */
      }
      next(e);
    }
  });

  /** POST /api/catalog/from-meal/:mealId */
  app.post("/api/catalog/from-meal/:mealId", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(paramValue(req.params.mealId), 10);
    const meal = storage.getMeal(mealId);
    if (!meal) throw ApiError.notFound("Приём пищи не найден");
    if (meal.userId !== req.user!.id) throw ApiError.forbidden("Нет доступа");
    const { name } = req.body;
    const item = storage.saveMealToCatalog(req.user!.id, mealId, name || meal.mealType);
    res.json({ item });
  });
}
// UX-21 — Calculate КБЖУ for catalog entry via AI
