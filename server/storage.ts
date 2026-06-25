import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { User, Day, InsertDay, Meal, InsertMeal, DaySummary, Secret } from "@shared/schema";
import { users, days, meals, secrets } from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, key)
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
    calories REAL,
    protein REAL,
    fat REAL,
    carbs REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Миграция: добавляем колонки КБЖУ в уже существующие таблицы
for (const col of ["calories", "protein", "fat", "carbs"]) {
  try {
    sqlite.exec(`ALTER TABLE meals ADD COLUMN ${col} REAL`);
  } catch {
    // Колонка уже существует — игнорируем
  }
}

// ── Time helpers ──────────────────────────────────────────────────────────────

export function getMskDate(utcMs?: number): string {
  const d = new Date((utcMs ?? Date.now()) + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function getMskTime(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(11, 16);
}

// ── Storage interface ─────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUserById(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(data: { username: string; email: string; passwordHash: string; displayName?: string }): User;

  // Secrets (encrypted in DB)
  getSecret(userId: number, key: string): Secret | undefined;
  setSecret(userId: number, key: string, encryptedValue: string, iv: string): Secret;
  listSecretKeys(userId: number): string[];

  // Days
  getDayByDate(userId: number, date: string): Day | undefined;
  getOrCreateDay(userId: number, date: string): Day;
  updateDaySummary(dayId: number, summary: DaySummary): Day;

  // Meals
  getMealsByDay(dayId: number): Meal[];
  addMeal(data: InsertMeal): Meal;
  updateMeal(id: number, data: Partial<InsertMeal>): Meal | undefined;
  deleteMeal(id: number): void;
  getMeal(id: number): Meal | undefined;
}

class SqliteStorage implements IStorage {
  getUserById(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  getUserByEmail(email: string) {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  createUser(data: { username: string; email: string; passwordHash: string; displayName?: string }): User {
    return db.insert(users).values({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      displayName: data.displayName ?? null,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  getSecret(userId: number, key: string) {
    return db.select().from(secrets).where(and(eq(secrets.userId, userId), eq(secrets.key, key))).get();
  }

  setSecret(userId: number, key: string, encryptedValue: string, iv: string): Secret {
    // upsert
    const existing = this.getSecret(userId, key);
    if (existing) {
      return db.update(secrets)
        .set({ encryptedValue, iv, updatedAt: new Date().toISOString() })
        .where(eq(secrets.id, existing.id))
        .returning().get();
    }
    return db.insert(secrets).values({
      userId, key, encryptedValue, iv, updatedAt: new Date().toISOString(),
    }).returning().get();
  }

  listSecretKeys(userId: number): string[] {
    return db.select({ key: secrets.key }).from(secrets).where(eq(secrets.userId, userId)).all().map(r => r.key);
  }

  getDayByDate(userId: number, date: string) {
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

  addMeal(data: InsertMeal): Meal {
    return db.insert(meals).values({ ...data, createdAt: new Date().toISOString() }).returning().get();
  }

  updateMeal(id: number, data: Partial<InsertMeal>) {
    return db.update(meals).set(data).where(eq(meals.id, id)).returning().get();
  }

  deleteMeal(id: number) {
    db.delete(meals).where(eq(meals.id, id)).run();
  }

  getMeal(id: number) {
    return db.select().from(meals).where(eq(meals.id, id)).get();
  }
}

export const storage = new SqliteStorage();
