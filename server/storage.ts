import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  Day,
  Meal,
  InsertMeal,
  DaySummary,
  Secret,
  RefreshToken,
  ApiUsage,
  PasswordResetToken,
  UserProfile,
} from "@shared/schema";
import {
  users,
  days,
  meals,
  secrets,
  refreshTokens,
  apiUsage,
  passwordResetTokens,
  userProfiles,
} from "@shared/schema";
import { calculateSleepDurationHours, countInclusiveDays, iterateDates } from "@shared/dates";
import {
  computeMealTimingMetrics,
  computePeriodInsights,
  computeRollingAverage,
  computeSleepDebtSeries,
  type MealType,
  type PeriodInsights,
} from "@shared/analytics";

const DB_PATH = process.env.SQLITE_DB_PATH || "data.db";
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

// Phase 3 — production SQLite tuning (WAL: safe concurrent reads during writes)
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
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
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_agent TEXT,
    ip TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    endpoint TEXT NOT NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    cost_estimate REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
  CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    wake_time TEXT,
    sleep_time TEXT,
    wake_date TEXT,
    sleep_date TEXT,
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
  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    gender TEXT DEFAULT 'unspecified',
    height_cm REAL,
    weight_kg REAL,
    activity_level TEXT DEFAULT 'medium',
    target_kcal REAL,
    target_protein REAL,
    target_fat REAL,
    target_carbs REAL,
    onboarding_skipped INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
`);

// Миграция: добавляем pd_consent_at в users (152-ФЗ)
try {
  sqlite.exec("ALTER TABLE users ADD COLUMN pd_consent_at TEXT");
} catch {
  // Колонка уже существует — игнорируем
}

try {
  sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin'))");
} catch {
  // Колонка уже существует — игнорируем
}

// Миграция: добавляем колонки КБЖУ в уже существующие таблицы
for (const col of ["calories", "protein", "fat", "carbs"]) {
  try {
    sqlite.exec(`ALTER TABLE meals ADD COLUMN ${col} REAL`);
  } catch {
    // Колонка уже существует — игнорируем
  }
}

for (const col of ["wake_date", "sleep_date"]) {
  try {
    sqlite.exec(`ALTER TABLE days ADD COLUMN ${col} TEXT`);
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

function round1(value: number): number {
  return Math.round(Number(value || 0) * 10) / 10;
}

function emptyAnalyticsDay(date: string): NutritionAnalyticsDay {
  return {
    date,
    mealsCount: 0,
    totalCalories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    waterLitres: 0,
    avgHunger: null,
    avgSatiety: null,
    wakeTime: null,
    sleepTime: null,
    wakeDate: null,
    sleepDate: null,
    sleepDuration: null,
    steps: null,
    sportActivity: null,
    firstMealTime: null,
    lastMealTime: null,
    eatingWindowHours: null,
    avgGapHours: null,
    maxGapHours: null,
    lateCaloriesRatio: null,
    overeatingCount: 0,
    caloriesByMealType: { завтрак: 0, обед: 0, перекус: 0, ужин: 0 },
    hasKbjuData: false,
    sleepDebt: null,
    rollingAvgCalories7: null,
  };
}

function calculateCurrentStreak(days: NutritionAnalyticsDay[]): number {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].mealsCount <= 0) break;
    streak += 1;
  }
  return streak;
}

// ── Storage interface ─────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUserById(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    pdConsentAt?: string;
  }): User;
  bootstrapAdminByUsername(username: string): User | undefined;
  updateUserPassword(userId: number, passwordHash: string): User | undefined;
  deleteUser(userId: number): void;
  getUserAllData(userId: number): { user: User | undefined; days: Day[]; meals: Meal[]; apiUsage: ApiUsage[] };
  getUserProfile(userId: number): UserProfile | undefined;
  upsertUserProfile(userId: number, data: Partial<UserProfile>): UserProfile;
  listUsers(): User[];
  listActiveRefreshSessions(nowIso?: string): AdminSession[];
  recordApiUsage(data: InsertApiUsage): ApiUsage;
  getApiUsageSummary(fromIso: string, toIso: string): ApiUsageSummary;
  getNutritionAnalytics(userId: number, fromDate: string, toDate: string): NutritionAnalyticsSummary;

  // Refresh tokens (hashed in DB)
  createRefreshToken(data: {
    token: string;
    userId: number;
    expiresAt: string;
    userAgent?: string | null;
    ip?: string | null;
  }): RefreshToken;
  getRefreshToken(token: string): RefreshToken | undefined;
  revokeRefreshToken(token: string): void;
  revokeRefreshSessionById(id: number): boolean;
  revokeUserRefreshTokens(userId: number): void;
  deleteExpiredOrRevokedRefreshTokens(nowIso?: string): void;
  createPasswordResetToken(data: { token: string; userId: number; expiresAt: string }): PasswordResetToken;
  getPasswordResetToken(tokenHash: string): PasswordResetToken | undefined;
  markPasswordResetTokenUsed(id: number): void;
  deleteExpiredPasswordResetTokens(nowIso?: string): void;

  // Secrets (encrypted in DB)
  getSecret(userId: number, key: string): Secret | undefined;
  setSecret(userId: number, key: string, encryptedValue: string, iv: string): Secret;
  listSecretKeys(userId: number): string[];

  // Days
  getDayById(id: number): Day | undefined;
  getDayByDate(userId: number, date: string): Day | undefined;
  getDaysInRange(userId: number, startDate: string, endDate: string): Day[];
  getOrCreateDay(userId: number, date: string): Day;
  updateDaySummary(dayId: number, summary: DaySummary): Day;

  // Meals
  getMealsByDay(dayId: number): Meal[];
  addMeal(data: InsertMeal): Meal;
  updateMeal(id: number, data: Partial<InsertMeal>): Meal | undefined;
  deleteMeal(id: number): void;
  getMeal(id: number): Meal | undefined;
}

export interface AdminSession {
  id: number;
  userId: number;
  username: string;
  email: string;
  displayName: string | null;
  role: User["role"];
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
}

export interface InsertApiUsage {
  userId: number;
  endpoint: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  timestamp?: string;
}

export interface ApiUsageDay {
  date: string;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  requests: number;
}

export interface ApiUsageSummary {
  totalRequests: number;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  byDay: ApiUsageDay[];
}

export interface NutritionAnalyticsDay {
  date: string;
  mealsCount: number;
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  waterLitres: number;
  avgHunger: number | null;
  avgSatiety: number | null;
  wakeTime: string | null;
  sleepTime: string | null;
  wakeDate: string | null;
  sleepDate: string | null;
  sleepDuration: number | null;
  steps: number | null;
  sportActivity: string | null;
  firstMealTime: string | null;
  lastMealTime: string | null;
  eatingWindowHours: number | null;
  avgGapHours: number | null;
  maxGapHours: number | null;
  lateCaloriesRatio: number | null;
  overeatingCount: number;
  caloriesByMealType: Record<MealType, number>;
  hasKbjuData: boolean;
  sleepDebt: number | null;
  rollingAvgCalories7: number | null;
}

export interface NutritionAnalyticsSummary {
  days: NutritionAnalyticsDay[];
  summary: {
    filledDays: number;
    periodDays: number;
    filledDaysRatio: number;
    currentStreak: number;
    avgCalories: number;
    avgSleep: number | null;
    totalCalories: number;
    totalWaterLitres: number;
    totalMeals: number;
  };
  insights: PeriodInsights;
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

  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    pdConsentAt?: string;
  }): User {
    return db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName ?? null,
        role: "user",
        pdConsentAt: data.pdConsentAt ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  deleteUser(userId: number): void {
    // Cascade delete in correct FK order
    sqlite.prepare("DELETE FROM api_usage WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM secrets WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM user_profiles WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM meals WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM days WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  getUserAllData(userId: number): { user: User | undefined; days: Day[]; meals: Meal[]; apiUsage: ApiUsage[] } {
    return {
      user: this.getUserById(userId),
      days: db.select().from(days).where(eq(days.userId, userId)).all(),
      meals: db.select().from(meals).where(eq(meals.userId, userId)).all(),
      apiUsage: db.select().from(apiUsage).where(eq(apiUsage.userId, userId)).all(),
    };
  }

  getUserProfile(userId: number): UserProfile | undefined {
    return db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).get();
  }

  upsertUserProfile(userId: number, data: Partial<UserProfile>): UserProfile {
    const existing = this.getUserProfile(userId);
    if (existing) {
      const { id: _id, userId: _userId, ...rest } = data;
      return db
        .update(userProfiles)
        .set({ ...rest, updatedAt: new Date().toISOString() })
        .where(eq(userProfiles.userId, userId))
        .returning()
        .get();
    }
    const { id: _id, userId: _userId, ...rest } = data;
    return db
      .insert(userProfiles)
      .values({
        userId,
        ...rest,
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  bootstrapAdminByUsername(username: string): User | undefined {
    const user = this.getUserByUsername(username);
    if (!user) return undefined;
    if (user.role === "admin") return user;
    return db.update(users).set({ role: "admin" }).where(eq(users.id, user.id)).returning().get();
  }

  updateUserPassword(userId: number, passwordHash: string): User | undefined {
    return db.update(users).set({ passwordHash }).where(eq(users.id, userId)).returning().get();
  }

  listUsers(): User[] {
    return db
      .select()
      .from(users)
      .all()
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  listActiveRefreshSessions(nowIso = new Date().toISOString()): AdminSession[] {
    return sqlite
      .prepare(
        `
      SELECT
        refresh_tokens.id AS id,
        refresh_tokens.user_id AS userId,
        users.username AS username,
        users.email AS email,
        users.display_name AS displayName,
        users.role AS role,
        refresh_tokens.created_at AS createdAt,
        refresh_tokens.expires_at AS expiresAt,
        refresh_tokens.user_agent AS userAgent,
        refresh_tokens.ip AS ip
      FROM refresh_tokens
      JOIN users ON users.id = refresh_tokens.user_id
      WHERE refresh_tokens.revoked = 0
        AND refresh_tokens.expires_at > ?
      ORDER BY refresh_tokens.created_at DESC
    `,
      )
      .all(nowIso) as AdminSession[];
  }

  recordApiUsage(data: InsertApiUsage): ApiUsage {
    return db
      .insert(apiUsage)
      .values({
        userId: data.userId,
        endpoint: data.endpoint,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        costEstimate: data.costEstimate,
        timestamp: data.timestamp ?? new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getApiUsageSummary(fromIso: string, toIso: string): ApiUsageSummary {
    const rows = sqlite
      .prepare(
        `
      SELECT
        substr(timestamp, 1, 10) AS date,
        COUNT(*) AS requests,
        COALESCE(SUM(tokens_in), 0) AS tokensIn,
        COALESCE(SUM(tokens_out), 0) AS tokensOut,
        COALESCE(SUM(cost_estimate), 0) AS costEstimate
      FROM api_usage
      WHERE endpoint = 'deepseek'
        AND timestamp >= ?
        AND timestamp < ?
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date DESC
    `,
      )
      .all(fromIso, toIso) as Array<{
      date: string;
      requests: number;
      tokensIn: number;
      tokensOut: number;
      costEstimate: number;
    }>;

    const byDay = rows.map((row) => ({
      date: row.date,
      requests: Number(row.requests),
      tokensIn: Number(row.tokensIn),
      tokensOut: Number(row.tokensOut),
      totalTokens: Number(row.tokensIn) + Number(row.tokensOut),
      costEstimate: Number(row.costEstimate),
    }));

    return byDay.reduce<ApiUsageSummary>(
      (summary, day) => ({
        totalRequests: summary.totalRequests + day.requests,
        tokensIn: summary.tokensIn + day.tokensIn,
        tokensOut: summary.tokensOut + day.tokensOut,
        totalTokens: summary.totalTokens + day.totalTokens,
        costEstimate: summary.costEstimate + day.costEstimate,
        byDay: summary.byDay,
      }),
      {
        totalRequests: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        costEstimate: 0,
        byDay,
      },
    );
  }

  getNutritionAnalytics(userId: number, fromDate: string, toDate: string): NutritionAnalyticsSummary {
    const rows = sqlite
      .prepare(
        `
      SELECT
        days.date AS date,
        days.wake_time AS wakeTime,
        days.sleep_time AS sleepTime,
        days.wake_date AS wakeDate,
        days.sleep_date AS sleepDate,
        days.steps AS steps,
        days.sport_activity AS sportActivity,
        COUNT(meals.id) AS mealsCount,
        COALESCE(SUM(meals.calories), 0) AS totalCalories,
        COALESCE(SUM(meals.protein), 0) AS protein,
        COALESCE(SUM(meals.fat), 0) AS fat,
        COALESCE(SUM(meals.carbs), 0) AS carbs,
        COALESCE(SUM(meals.water_units), 0) AS waterUnits,
        AVG(meals.hunger_before) AS avgHunger,
        AVG(meals.satiety_after) AS avgSatiety
      FROM days
      LEFT JOIN meals ON meals.day_id = days.id
      WHERE days.user_id = ?
        AND days.date >= ?
        AND days.date <= ?
      GROUP BY days.id
      ORDER BY days.date ASC
    `,
      )
      .all(userId, fromDate, toDate) as Array<{
      date: string;
      wakeTime: string | null;
      sleepTime: string | null;
      wakeDate: string | null;
      sleepDate: string | null;
      steps: number | null;
      sportActivity: string | null;
      mealsCount: number;
      totalCalories: number;
      protein: number;
      fat: number;
      carbs: number;
      waterUnits: number;
      avgHunger: number | null;
      avgSatiety: number | null;
    }>;

    const mealRows = sqlite
      .prepare(
        `
      SELECT
        days.date AS date,
        meals.ts_start AS tsStart,
        meals.meal_type AS mealType,
        meals.calories AS calories,
        meals.hunger_before AS hungerBefore,
        meals.satiety_after AS satietyAfter,
        meals.context_note AS contextNote
      FROM meals
      JOIN days ON meals.day_id = days.id
      WHERE days.user_id = ?
        AND days.date >= ?
        AND days.date <= ?
      ORDER BY days.date ASC, meals.ts_start ASC
    `,
      )
      .all(userId, fromDate, toDate) as Array<{
      date: string;
      tsStart: string;
      mealType: string;
      calories: number | null;
      hungerBefore: number | null;
      satietyAfter: number | null;
      contextNote: string | null;
    }>;

    const mealsByDate = new Map<string, typeof mealRows>();
    for (const meal of mealRows) {
      const list = mealsByDate.get(meal.date) ?? [];
      list.push(meal);
      mealsByDate.set(meal.date, list);
    }

    const rowByDate = new Map(rows.map((row) => [row.date, row]));
    const baseDays = iterateDates(fromDate, toDate).map((date) => {
      const row = rowByDate.get(date);
      if (!row) return emptyAnalyticsDay(date);

      const sleepDuration = calculateSleepDurationHours(
        row.date,
        row.sleepTime,
        row.wakeTime,
        row.sleepDate,
        row.wakeDate,
      );
      const dayMeals = mealsByDate.get(date) ?? [];
      const timing = computeMealTimingMetrics(dayMeals);

      return {
        date: row.date,
        mealsCount: Number(row.mealsCount),
        totalCalories: round1(row.totalCalories),
        protein: round1(row.protein),
        fat: round1(row.fat),
        carbs: round1(row.carbs),
        waterLitres: round1(Number(row.waterUnits) * 0.5),
        avgHunger: row.avgHunger == null ? null : round1(row.avgHunger),
        avgSatiety: row.avgSatiety == null ? null : round1(row.avgSatiety),
        wakeTime: row.wakeTime,
        sleepTime: row.sleepTime,
        wakeDate: row.wakeDate,
        sleepDate: row.sleepDate,
        sleepDuration,
        steps: row.steps,
        sportActivity: row.sportActivity,
        firstMealTime: timing.firstMealTime,
        lastMealTime: timing.lastMealTime,
        eatingWindowHours: timing.eatingWindowHours,
        avgGapHours: timing.avgGapHours,
        maxGapHours: timing.maxGapHours,
        lateCaloriesRatio: timing.lateCaloriesRatio,
        overeatingCount: timing.overeatingCount,
        caloriesByMealType: timing.caloriesByMealType,
        hasKbjuData: timing.hasKbjuData,
        sleepDebt: null,
        rollingAvgCalories7: null,
      };
    });

    const sleepDebtSeries = computeSleepDebtSeries(baseDays);
    const rollingCalories = computeRollingAverage(
      baseDays.map((d) => d.totalCalories),
      7,
    );
    const analyticsDays = baseDays.map((day, index) => ({
      ...day,
      sleepDebt: sleepDebtSeries.get(day.date) ?? null,
      rollingAvgCalories7: rollingCalories[index],
    }));

    const periodDays = countInclusiveDays(fromDate, toDate);
    const filledDays = analyticsDays.filter((day) => day.mealsCount > 0).length;
    const totalMeals = analyticsDays.reduce((sum, day) => sum + day.mealsCount, 0);
    const totalCalories = analyticsDays.reduce((sum, day) => sum + day.totalCalories, 0);
    const totalWaterLitres = analyticsDays.reduce((sum, day) => sum + day.waterLitres, 0);
    const daysWithCalories = analyticsDays.filter((day) => day.totalCalories > 0);
    const daysWithSleep = analyticsDays.filter((day) => day.sleepDuration != null);

    const insights = computePeriodInsights(analyticsDays, mealRows, mealsByDate);

    return {
      days: analyticsDays,
      summary: {
        filledDays,
        periodDays,
        filledDaysRatio: periodDays > 0 ? round1(filledDays / periodDays) : 0,
        currentStreak: calculateCurrentStreak(analyticsDays),
        avgCalories: daysWithCalories.length ? round1(totalCalories / daysWithCalories.length) : 0,
        avgSleep: daysWithSleep.length
          ? round1(daysWithSleep.reduce((sum, day) => sum + (day.sleepDuration ?? 0), 0) / daysWithSleep.length)
          : null,
        totalCalories: round1(totalCalories),
        totalWaterLitres: round1(totalWaterLitres),
        totalMeals,
      },
      insights,
    };
  }

  createRefreshToken(data: {
    token: string;
    userId: number;
    expiresAt: string;
    userAgent?: string | null;
    ip?: string | null;
  }): RefreshToken {
    return db
      .insert(refreshTokens)
      .values({
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revoked: false,
        createdAt: new Date().toISOString(),
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
      })
      .returning()
      .get();
  }

  getRefreshToken(token: string) {
    return db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).get();
  }

  revokeRefreshToken(token: string) {
    db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, token)).run();
  }

  revokeRefreshSessionById(id: number): boolean {
    const result = sqlite.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ? AND revoked = 0").run(id);
    return result.changes > 0;
  }

  revokeUserRefreshTokens(userId: number) {
    db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId)).run();
  }

  deleteExpiredOrRevokedRefreshTokens(nowIso = new Date().toISOString()) {
    sqlite.prepare("DELETE FROM refresh_tokens WHERE revoked = 1 OR expires_at <= ?").run(nowIso);
  }

  createPasswordResetToken(data: { token: string; userId: number; expiresAt: string }): PasswordResetToken {
    return db
      .insert(passwordResetTokens)
      .values({
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getPasswordResetToken(tokenHash: string) {
    return db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash)).get();
  }

  markPasswordResetTokenUsed(id: number) {
    db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id)).run();
  }

  deleteExpiredPasswordResetTokens(nowIso = new Date().toISOString()) {
    sqlite.prepare("DELETE FROM password_reset_tokens WHERE used = 1 OR expires_at <= ?").run(nowIso);
  }

  getSecret(userId: number, key: string) {
    return db
      .select()
      .from(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
      .get();
  }

  setSecret(userId: number, key: string, encryptedValue: string, iv: string): Secret {
    // upsert
    const existing = this.getSecret(userId, key);
    if (existing) {
      return db
        .update(secrets)
        .set({ encryptedValue, iv, updatedAt: new Date().toISOString() })
        .where(eq(secrets.id, existing.id))
        .returning()
        .get();
    }
    return db
      .insert(secrets)
      .values({
        userId,
        key,
        encryptedValue,
        iv,
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  listSecretKeys(userId: number): string[] {
    return db
      .select({ key: secrets.key })
      .from(secrets)
      .where(eq(secrets.userId, userId))
      .all()
      .map((r) => r.key);
  }

  getDayById(id: number) {
    return db.select().from(days).where(eq(days.id, id)).get();
  }

  getDayByDate(userId: number, date: string) {
    return db
      .select()
      .from(days)
      .where(and(eq(days.userId, userId), eq(days.date, date)))
      .get();
  }

  getDaysInRange(userId: number, startDate: string, endDate: string): Day[] {
    return sqlite
      .prepare("SELECT * FROM days WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC")
      .all(userId, startDate, endDate)
      .map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        wakeTime: row.wake_time,
        sleepTime: row.sleep_time,
        wakeDate: row.wake_date,
        sleepDate: row.sleep_date,
        sportActivity: row.sport_activity,
        steps: row.steps,
        dayComment: row.day_comment,
        summaryFilled: !!row.summary_filled,
      })) as Day[];
  }

  getOrCreateDay(userId: number, date: string): Day {
    const existing = this.getDayByDate(userId, date);
    if (existing) return existing;
    return db.insert(days).values({ userId, date, summaryFilled: false }).returning().get();
  }

  updateDaySummary(dayId: number, summary: DaySummary): Day {
    return db
      .update(days)
      .set({
        wakeTime: summary.wakeTime || null,
        sleepTime: summary.sleepTime || null,
        wakeDate: summary.wakeDate || null,
        sleepDate: summary.sleepDate || null,
        sportActivity: summary.sportActivity || null,
        steps: summary.steps ? Number(summary.steps) : null,
        dayComment: summary.dayComment || null,
        summaryFilled: true,
      })
      .where(eq(days.id, dayId))
      .returning()
      .get();
  }

  getMealsByDay(dayId: number): Meal[] {
    return db
      .select()
      .from(meals)
      .where(eq(meals.dayId, dayId))
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
