import type { Express } from "express";
import { storage } from "../storage";
import { createCatalogItemSchema } from "@shared/schema";
import { requireAuth, type AuthRequest } from "../auth";
import { paramValue } from "./helpers";

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
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = storage.createCatalogItem(req.user!.id, parsed.data);
    res.json({ item });
  });

  /** PUT /api/catalog/:id — переименовать / изменить описание */
  app.put("/api/catalog/:id", requireAuth, (req: AuthRequest, res) => {
    const itemId = parseInt(paramValue(req.params.id), 10);
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) return res.status(400).json({ error: "Название обязательно" });
    const item = storage.updateCatalogItem(req.user!.id, itemId, { name: name.trim(), description });
    if (!item) return res.status(404).json({ error: "Шаблон не найден" });
    res.json({ item });
  });

  /** DELETE /api/catalog/:id */
  app.delete("/api/catalog/:id", requireAuth, (req: AuthRequest, res) => {
    const itemId = parseInt(paramValue(req.params.id), 10);
    storage.deleteCatalogItem(req.user!.id, itemId);
    res.json({ ok: true });
  });

  /** POST /api/catalog/from-meal/:mealId */
  app.post("/api/catalog/from-meal/:mealId", requireAuth, (req: AuthRequest, res) => {
    const mealId = parseInt(paramValue(req.params.mealId), 10);
    const meal = storage.getMeal(mealId);
    if (!meal) return res.status(404).json({ error: "Приём пищи не найден" });
    if (meal.userId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });
    const { name } = req.body;
    const item = storage.saveMealToCatalog(req.user!.id, mealId, name || meal.mealType);
    res.json({ item });
  });
}
