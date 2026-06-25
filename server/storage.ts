import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { User, InsertUser, Day, InsertDay, Meal, InsertMeal, DaySummary } from "@shared/schema";
import { days, meals, users } from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite, { schema });

// Run migrations manually (simple approach)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_user_id TEXT UNIQUE,
    tg_username TEXT,
    web_token TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    wake_time TEXT,
    sleep_time TEXT,
    sport_activity TEXT,
    steps INTEGER,
    day_comment TEXT,
    summary_filled INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
  );
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    ts_start TEXT NOT NULL,
    ts_end TEXT,
    meal_type TEXT NOT NULL,
    food_text TEXT,
    drink_text TEXT,
    water_units REAL,
    hunger_before INTEGER,
    satiety_after INTEGER,
    context_note TEXT,
    source TEXT NOT NULL DEFAULT 'web',
    raw_input TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns MSK date string YYYY-MM-DD for a given UTC timestamp (or now) */
export function getMskDate(utcMs?: number): string {
  const d = new Date((utcMs ?? Date.now()) + 3 * 60 * 60 * 1000); // +3h
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Returns current MSK time HH:MM */
export function getMskTime(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(11, 16);
}

export interface IStorage {
  // Users
  getUserByToken(token: string): User | undefined;
  getUserByTgId(tgId: string): User | undefined;
  createUser(data: InsertUser): User;
  ensureWebUser(): User; // returns the single web user (token = "web")

  // Days
  getDayByDate(userId: number, date: string): Day | undefined;
  getOrCreateDay(userId: number, date: string): Day;
  updateDaySummary(dayId: number, summary: DaySummary): Day;

  // Meals
  getMealsByDay(dayId: number): Meal[];
  getMealsByDate(userId: number, date: string): Meal[];
  addMeal(data: InsertMeal): Meal;
  updateMeal(id: number, data: Partial<InsertMeal>): Meal | undefined;
  deleteMeal(id: number): void;
  getMeal(id: number): Meal | undefined;
}

class SqliteStorage implements IStorage {
  getUserByToken(token: string): User | undefined {
    return db.select().from(users).where(eq(users.webToken, token)).get();
  }

  getUserByTgId(tgId: string): User | undefined {
    return db.select().from(users).where(eq(users.tgUserId, tgId)).get();
  }

  createUser(data: InsertUser): User {
    return db.insert(users).values({ ...data, createdAt: new Date().toISOString() }).returning().get();
  }

  ensureWebUser(): User {
    const existing = this.getUserByToken("web");
    if (existing) return existing;
    return this.createUser({ tgUserId: null, tgUsername: null, webToken: "web" });
  }

  getDayByDate(userId: number, date: string): Day | undefined {
    return db.select().from(days).where(and(eq(days.userId, userId), eq(days.date, date))).get();
  }

  getOrCreateDay(userId: number, date: string): Day {
    const existing = this.getDayByDate(userId, date);
    if (existing) return existing;
    return db.insert(days).values({ userId, date, summaryFilled: false }).returning().get();
  }

  updateDaySummary(dayId: number, summary: DaySummary): Day {
    return db.update(days)
      .set({ ...summary, steps: summary.steps ? Number(summary.steps) : null, summaryFilled: true })
      .where(eq(days.id, dayId))
      .returning().get();
  }

  getMealsByDay(dayId: number): Meal[] {
    return db.select().from(meals).where(eq(meals.dayId, dayId)).all()
      .sort((a, b) => a.tsStart.localeCompare(b.tsStart));
  }

  getMealsByDate(userId: number, date: string): Meal[] {
    const day = this.getDayByDate(userId, date);
    if (!day) return [];
    return this.getMealsByDay(day.id);
  }

  addMeal(data: InsertMeal): Meal {
    return db.insert(meals).values({ ...data, createdAt: new Date().toISOString() }).returning().get();
  }

  updateMeal(id: number, data: Partial<InsertMeal>): Meal | undefined {
    return db.update(meals).set(data).where(eq(meals.id, id)).returning().get();
  }

  deleteMeal(id: number): void {
    db.delete(meals).where(eq(meals.id, id)).run();
  }

  getMeal(id: number): Meal | undefined {
    return db.select().from(meals).where(eq(meals.id, id)).get();
  }
}

export const storage = new SqliteStorage();
