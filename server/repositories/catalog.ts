import { and, eq } from "drizzle-orm";
import {
  foodCatalogEntries,
  foodCatalogItems,
  type CreateCatalogItem,
  type FoodCatalogEntry,
  type FoodCatalogItem,
} from "@shared/schema";
import { db } from "../db";
import { mealRepository } from "./meal";

type CatalogWithEntries = FoodCatalogItem & { entries: FoodCatalogEntry[] };

export class CatalogRepository {
  getCatalogItems(userId: number): CatalogWithEntries[] {
    const items = db.select().from(foodCatalogItems).where(eq(foodCatalogItems.userId, userId)).all();
    return items.map((item) => ({
      ...item,
      entries: db.select().from(foodCatalogEntries).where(eq(foodCatalogEntries.catalogItemId, item.id)).all(),
    }));
  }

  createCatalogItem(userId: number, data: CreateCatalogItem): CatalogWithEntries {
    const item = db
      .insert(foodCatalogItems)
      .values({
        userId,
        name: data.name,
        description: data.description ?? null,
        isSet: data.isSet ?? false,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    const entries: FoodCatalogEntry[] = [];
    for (const e of data.entries ?? []) {
      const entry = db
        .insert(foodCatalogEntries)
        .values({
          catalogItemId: item.id,
          mealName: e.mealName,
          grams: e.grams ?? null,
          kcal: e.kcal ?? null,
          protein: e.protein ?? null,
          fat: e.fat ?? null,
          carbs: e.carbs ?? null,
        })
        .returning()
        .get();
      entries.push(entry);
    }
    return { ...item, entries };
  }

  updateCatalogItem(
    userId: number,
    itemId: number,
    data: { name: string; description?: string },
  ): CatalogWithEntries | null {
    const existing = db
      .select()
      .from(foodCatalogItems)
      .where(and(eq(foodCatalogItems.id, itemId), eq(foodCatalogItems.userId, userId)))
      .get();
    if (!existing) return null;
    db.update(foodCatalogItems)
      .set({ name: data.name, description: data.description ?? null })
      .where(eq(foodCatalogItems.id, itemId))
      .run();
    const updated = db.select().from(foodCatalogItems).where(eq(foodCatalogItems.id, itemId)).get()!;
    return {
      ...updated,
      entries: db.select().from(foodCatalogEntries).where(eq(foodCatalogEntries.catalogItemId, itemId)).all(),
    };
  }

  deleteCatalogItem(userId: number, itemId: number): void {
    db.delete(foodCatalogItems)
      .where(and(eq(foodCatalogItems.id, itemId), eq(foodCatalogItems.userId, userId)))
      .run();
  }

  updateCatalogEntryKbju(
    userId: number,
    entryId: number,
    data: { kcal: number; protein: number; fat: number; carbs: number },
  ): void {
    const entry = db
      .select({ id: foodCatalogEntries.id, catalogItemId: foodCatalogEntries.catalogItemId })
      .from(foodCatalogEntries)
      .where(eq(foodCatalogEntries.id, entryId))
      .get();
    if (!entry) return;
    const item = db
      .select({ userId: foodCatalogItems.userId })
      .from(foodCatalogItems)
      .where(and(eq(foodCatalogItems.id, entry.catalogItemId), eq(foodCatalogItems.userId, userId)))
      .get();
    if (!item) return;
    db.update(foodCatalogEntries)
      .set({ kcal: data.kcal, protein: data.protein, fat: data.fat, carbs: data.carbs })
      .where(eq(foodCatalogEntries.id, entryId))
      .run();
  }

  saveMealToCatalog(userId: number, mealId: number, name: string): CatalogWithEntries {
    const meal = mealRepository.getMeal(mealId);
    if (!meal) throw new Error("Meal not found");

    const itemName = name || meal.mealType;
    const item = db
      .insert(foodCatalogItems)
      .values({
        userId,
        name: itemName,
        description: meal.foodText ?? null,
        isSet: false,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    const entries: FoodCatalogEntry[] = [];
    if (meal.foodText) {
      const entry = db
        .insert(foodCatalogEntries)
        .values({
          catalogItemId: item.id,
          mealName: meal.foodText.slice(0, 200),
          grams: null,
          kcal: meal.calories ?? null,
          protein: meal.protein ?? null,
          fat: meal.fat ?? null,
          carbs: meal.carbs ?? null,
        })
        .returning()
        .get();
      entries.push(entry);
    }
    return { ...item, entries };
  }
}

export const catalogRepository = new CatalogRepository();
