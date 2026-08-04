import { and, eq, sql } from "drizzle-orm";
import { meals, type InsertMeal, type Meal } from "@shared/schema";
import { db } from "../db";

/**
 * MealRepository — real Drizzle access (Phase 29.2).
 * Uses shared db connection; storage facade delegates meal CRUD here.
 */
export class MealRepository {
  getMealsByDay(dayId: number): Meal[] {
    return db
      .select()
      .from(meals)
      .where(and(eq(meals.dayId, dayId), sql`${meals.deletedAt} IS NULL`))
      .all()
      .sort((a, b) => a.tsStart.localeCompare(b.tsStart));
  }

  addMeal(data: InsertMeal): Meal {
    return db
      .insert(meals)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  updateMeal(id: number, data: Partial<InsertMeal>): Meal | undefined {
    return db.update(meals).set(data).where(eq(meals.id, id)).returning().get();
  }

  deleteMeal(id: number): void {
    db.update(meals).set({ deletedAt: new Date().toISOString() }).where(eq(meals.id, id)).run();
  }

  restoreMeal(id: number): void {
    db.update(meals).set({ deletedAt: null }).where(eq(meals.id, id)).run();
  }

  hardDeleteExpiredMeals(olderThanDays = 30): void {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    db.delete(meals)
      .where(and(sql`${meals.deletedAt} IS NOT NULL`, sql`${meals.deletedAt} < ${cutoff}`))
      .run();
  }

  getMeal(id: number): Meal | undefined {
    return db.select().from(meals).where(eq(meals.id, id)).get();
  }
}

export const mealRepository = new MealRepository();
