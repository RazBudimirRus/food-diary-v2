import { eq, and, sql, desc } from "drizzle-orm";
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
  Doctor,
  DoctorPatient,
  DoctorMealNote,
  DoctorPlan,
  InsertDoctorPlan,
  FoodCatalogItem,
  FoodCatalogEntry,
  CreateCatalogItem,
  Photo,
  PushSubscription,
  AuditLogEntry,
  NewAuditLogEntry,
} from "@shared/schema";
import { idempotencyKeys, clientErrors } from "@shared/schema";
import { calculateSleepDurationHours, countInclusiveDays, iterateDates, mskNowTime, mskToday } from "@shared/dates";
import {
  computeMealTimingMetrics,
  computePeriodInsights,
  computeRollingAverage,
  computeSleepDebtSeries,
  type MealType,
  type PeriodInsights,
} from "@shared/analytics";
import type { AdminSession, ApiUsageDay, ApiUsageSummary, InsertApiUsage } from "./admin-types";
import { db, sqlite } from "./db";
import { auditRepository } from "./repositories/audit";
import { catalogRepository } from "./repositories/catalog";
import { dayRepository } from "./repositories/day";
import { doctorRepository } from "./repositories/doctor";
import { mealRepository } from "./repositories/meal";
import { photoRepository } from "./repositories/photo";
import { sessionRepository } from "./repositories/session";
import { userRepository } from "./repositories/user";

export type { AdminSession, ApiUsageDay, ApiUsageSummary, InsertApiUsage } from "./admin-types";
export { db, sqlite };
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'doctor', 'admin')),
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
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    telegram_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS doctor_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(doctor_id, patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS doctor_meal_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    meal_id INTEGER NOT NULL,
    note TEXT,
    suggested_kcal REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS doctor_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    kcal REAL,
    protein REAL,
    fat REAL,
    carbs REAL,
    water_ml REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_doctor_plans_patient ON doctor_plans(patient_id, start_date);
  CREATE TABLE IF NOT EXISTS food_catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_set INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_food_catalog_items_user ON food_catalog_items(user_id);
  CREATE TABLE IF NOT EXISTS food_catalog_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_item_id INTEGER NOT NULL,
    meal_name TEXT NOT NULL,
    grams REAL,
    kcal REAL,
    protein REAL,
    fat REAL,
    carbs REAL,
    FOREIGN KEY (catalog_item_id) REFERENCES food_catalog_items(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    meal_id INTEGER,
    s3_key TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
  CREATE INDEX IF NOT EXISTS idx_photos_meal ON photos(meal_id);
`);

// Phase 26.1: Все миграции вынесены в /migrations/ (drizzle-kit).
// Запуск: runMigrations() в server/index.ts перед инициализацией storage.

// ── Time helpers ──────────────────────────────────────────────────────────────

export function getMskDate(utcMs?: number): string {
  return mskToday(utcMs);
}

export function getMskTime(): string {
  return mskNowTime();
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
  searchUsers(q: string, limit?: number): User[];
  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    pdConsentAt?: string;
  }): User;
  bootstrapAdminByUsername(username: string): User | undefined;
  updateUserPassword(userId: number, passwordHash: string): User | undefined;
  updateUserProfile(userId: number, data: { displayName?: string }): User | undefined;
  setLastLogin(userId: number): void;
  // Phase 28.2: MFA
  setMfaSecret(userId: number, packedSecret: string): void;
  enableMfa(userId: number): void;
  disableMfa(userId: number): void;
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

  // Phase 20 — Dietary Restrictions
  upsertDietaryRestrictions(userId: number, restrictions: string): UserProfile;

  // Phase 15 — Doctor Cabinet
  getDoctorByUserId(userId: number): Doctor | undefined;
  upsertDoctor(userId: number, data: { fullName: string; phone?: string; telegramUrl?: string }): Doctor;
  getDoctorPatients(doctorId: number): Array<{ user: User; assignedAt: string }>;
  assignPatient(doctorId: number, patientId: number): DoctorPatient;
  removePatient(doctorId: number, patientId: number): void;
  getPatientDoctor(patientId: number): Doctor | undefined;
  addDoctorMealNote(data: { doctorId: number; mealId: number; note?: string; suggestedKcal?: number }): DoctorMealNote;
  getDoctorMealNotes(mealId: number): DoctorMealNote[];
  setUserRole(userId: number, role: "user" | "doctor" | "admin"): User | undefined;
  savePushSubscription(data: { userId: number; endpoint: string; p256dh: string; auth: string }): PushSubscription;
  getUserPushSubscriptions(userId: number): PushSubscription[];
  deletePushSubscription(endpoint: string): void;

  // Phase 18 — Doctor Plans
  createDoctorPlan(doctorId: number, data: InsertDoctorPlan): DoctorPlan;
  getDoctorPlansForPatient(patientId: number): DoctorPlan[];
  deleteDoctorPlan(planId: number): void;
  getActivePlan(patientId: number, date: string): DoctorPlan | undefined;

  // UX-7 — Food Catalog
  getCatalogItems(userId: number): Array<FoodCatalogItem & { entries: FoodCatalogEntry[] }>;
  createCatalogItem(userId: number, data: CreateCatalogItem): FoodCatalogItem & { entries: FoodCatalogEntry[] };
  updateCatalogItem(
    userId: number,
    itemId: number,
    data: { name: string; description?: string },
  ): (FoodCatalogItem & { entries: FoodCatalogEntry[] }) | null;
  deleteCatalogItem(userId: number, itemId: number): void;
  saveMealToCatalog(userId: number, mealId: number, name: string): FoodCatalogItem & { entries: FoodCatalogEntry[] };
  // UX-21: update КБЖУ for a specific entry row
  updateCatalogEntryKbju(
    userId: number,
    entryId: number,
    data: { kcal: number; protein: number; fat: number; carbs: number },
  ): void;

  // Phase 23 — Photos
  savePhoto(data: { id: string; userId: number; mealId?: number | null; s3Key: string; sizeBytes: number }): Photo;
  getPhoto(photoId: string): Photo | undefined;
  getPhotosByMeal(mealId: number): Photo[];
  getPhotosByUser(userId: number): Photo[];
  deletePhoto(photoId: string): void;
  countUserPhotos(userId: number): number;

  // Phase 24 — Audit Log
  addAuditLog(data: Omit<NewAuditLogEntry, "id" | "createdAt">): Promise<void>;
  getAuditLog(filters: {
    actorId?: number;
    targetId?: number;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]>;
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
    return userRepository.getUserById(id);
  }

  getUserByUsername(username: string) {
    return userRepository.getUserByUsername(username);
  }

  getUserByEmail(email: string) {
    return userRepository.getUserByEmail(email);
  }

  searchUsers(q: string, limit = 10): User[] {
    return userRepository.searchUsers(q, limit);
  }

  createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    pdConsentAt?: string;
  }): User {
    return userRepository.createUser(data);
  }

  deleteUser(userId: number): void {
    userRepository.deleteUser(userId);
  }

  getUserAllData(userId: number): { user: User | undefined; days: Day[]; meals: Meal[]; apiUsage: ApiUsage[] } {
    return userRepository.getUserAllData(userId);
  }

  getUserProfile(userId: number): UserProfile | undefined {
    return userRepository.getUserProfile(userId);
  }

  upsertUserProfile(userId: number, data: Partial<UserProfile>): UserProfile {
    return userRepository.upsertUserProfile(userId, data);
  }

  bootstrapAdminByUsername(username: string): User | undefined {
    return userRepository.bootstrapAdminByUsername(username);
  }

  updateUserPassword(userId: number, passwordHash: string): User | undefined {
    return userRepository.updateUserPassword(userId, passwordHash);
  }

  updateUserProfile(userId: number, data: { displayName?: string }): User | undefined {
    return userRepository.updateUserProfile(userId, data);
  }

  setLastLogin(userId: number): void {
    userRepository.setLastLogin(userId);
  }

  // Phase 28.2: MFA
  setMfaSecret(userId: number, packedSecret: string): void {
    userRepository.setMfaSecret(userId, packedSecret);
  }
  enableMfa(userId: number): void {
    userRepository.enableMfa(userId);
  }
  disableMfa(userId: number): void {
    userRepository.disableMfa(userId);
  }

  listUsers(): User[] {
    return userRepository.listUsers();
  }

  listActiveRefreshSessions(nowIso = new Date().toISOString()): AdminSession[] {
    return sessionRepository.listActiveRefreshSessions(nowIso);
  }

  recordApiUsage(data: InsertApiUsage): ApiUsage {
    return sessionRepository.recordApiUsage(data);
  }

  getApiUsageSummary(fromIso: string, toIso: string): ApiUsageSummary {
    return sessionRepository.getApiUsageSummary(fromIso, toIso);
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
        COALESCE(SUM(meals.water_ml), 0) AS waterMlTotal,
        AVG(meals.hunger_before) AS avgHunger,
        AVG(meals.satiety_after) AS avgSatiety
      FROM days
      LEFT JOIN meals ON meals.day_id = days.id AND meals.deleted_at IS NULL
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
      waterMlTotal: number;
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
        AND meals.deleted_at IS NULL
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
        waterLitres: round1(Number(row.waterMlTotal) / 1000),
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
    return sessionRepository.createRefreshToken(data);
  }

  getRefreshToken(token: string) {
    return sessionRepository.getRefreshToken(token);
  }

  revokeRefreshToken(token: string) {
    sessionRepository.revokeRefreshToken(token);
  }

  revokeRefreshSessionById(id: number): boolean {
    return sessionRepository.revokeRefreshSessionById(id);
  }

  revokeUserRefreshTokens(userId: number) {
    sessionRepository.revokeUserRefreshTokens(userId);
  }

  deleteExpiredOrRevokedRefreshTokens(nowIso = new Date().toISOString()) {
    sessionRepository.deleteExpiredOrRevokedRefreshTokens(nowIso);
  }

  createPasswordResetToken(data: { token: string; userId: number; expiresAt: string }): PasswordResetToken {
    return sessionRepository.createPasswordResetToken(data);
  }

  getPasswordResetToken(tokenHash: string) {
    return sessionRepository.getPasswordResetToken(tokenHash);
  }

  markPasswordResetTokenUsed(id: number) {
    sessionRepository.markPasswordResetTokenUsed(id);
  }

  deleteExpiredPasswordResetTokens(nowIso = new Date().toISOString()) {
    sessionRepository.deleteExpiredPasswordResetTokens(nowIso);
  }

  getSecret(userId: number, key: string) {
    return userRepository.getSecret(userId, key);
  }

  setSecret(userId: number, key: string, encryptedValue: string, iv: string): Secret {
    return userRepository.setSecret(userId, key, encryptedValue, iv);
  }

  listSecretKeys(userId: number): string[] {
    return userRepository.listSecretKeys(userId);
  }

  getDayById(id: number) {
    return dayRepository.getDayById(id);
  }

  getDayByDate(userId: number, date: string) {
    return dayRepository.getDayByDate(userId, date);
  }

  getDaysInRange(userId: number, startDate: string, endDate: string): Day[] {
    return dayRepository.getDaysInRange(userId, startDate, endDate);
  }

  getOrCreateDay(userId: number, date: string): Day {
    return dayRepository.getOrCreateDay(userId, date);
  }

  updateDaySummary(dayId: number, summary: DaySummary): Day {
    return dayRepository.updateDaySummary(dayId, summary);
  }

  getMealsByDay(dayId: number): Meal[] {
    return mealRepository.getMealsByDay(dayId);
  }

  addMeal(data: InsertMeal): Meal {
    return mealRepository.addMeal(data);
  }

  updateMeal(id: number, data: Partial<InsertMeal>) {
    return mealRepository.updateMeal(id, data);
  }

  deleteMeal(id: number) {
    mealRepository.deleteMeal(id);
  }

  restoreMeal(id: number) {
    mealRepository.restoreMeal(id);
  }

  hardDeleteExpiredMeals(olderThanDays = 30) {
    mealRepository.hardDeleteExpiredMeals(olderThanDays);
  }

  getMeal(id: number) {
    return mealRepository.getMeal(id);
  }

  // ── Phase 20 — Dietary Restrictions ─────────────────────────────────────────

  upsertDietaryRestrictions(userId: number, restrictions: string): UserProfile {
    return userRepository.upsertDietaryRestrictions(userId, restrictions);
  }

  // ── Phase 15 — Doctor Cabinet ────────────────────────────────────────────────

  getDoctorByUserId(userId: number): Doctor | undefined {
    return doctorRepository.getDoctorByUserId(userId);
  }

  upsertDoctor(userId: number, data: { fullName: string; phone?: string; telegramUrl?: string }): Doctor {
    return doctorRepository.upsertDoctor(userId, data);
  }

  getDoctorPatients(doctorId: number): Array<{ user: User; assignedAt: string }> {
    return doctorRepository.getDoctorPatients(doctorId);
  }

  assignPatient(doctorId: number, patientId: number): DoctorPatient {
    return doctorRepository.assignPatient(doctorId, patientId);
  }

  removePatient(doctorId: number, patientId: number): void {
    doctorRepository.removePatient(doctorId, patientId);
  }

  getPatientDoctor(patientId: number): Doctor | undefined {
    return doctorRepository.getPatientDoctor(patientId);
  }

  addDoctorMealNote(data: { doctorId: number; mealId: number; note?: string; suggestedKcal?: number }): DoctorMealNote {
    return doctorRepository.addDoctorMealNote(data);
  }

  getDoctorMealNotes(mealId: number): DoctorMealNote[] {
    return doctorRepository.getDoctorMealNotes(mealId);
  }

  setUserRole(userId: number, role: "user" | "doctor" | "admin"): User | undefined {
    return userRepository.setUserRole(userId, role);
  }

  savePushSubscription(data: { userId: number; endpoint: string; p256dh: string; auth: string }): PushSubscription {
    return userRepository.savePushSubscription(data);
  }

  getUserPushSubscriptions(userId: number): PushSubscription[] {
    return userRepository.getUserPushSubscriptions(userId);
  }

  deletePushSubscription(endpoint: string): void {
    userRepository.deletePushSubscription(endpoint);
  }

  // ── Phase 18 — Doctor Plans ──────────────────────────────────────────────────

  createDoctorPlan(doctorId: number, data: InsertDoctorPlan): DoctorPlan {
    return doctorRepository.createDoctorPlan(doctorId, data);
  }

  getDoctorPlansForPatient(patientId: number): DoctorPlan[] {
    return doctorRepository.getDoctorPlansForPatient(patientId);
  }

  deleteDoctorPlan(planId: number): void {
    doctorRepository.deleteDoctorPlan(planId);
  }

  getActivePlan(patientId: number, date: string): DoctorPlan | undefined {
    return doctorRepository.getActivePlan(patientId, date);
  }

  // ── UX-7 — Food Catalog ───────────────────────────────────────────────────────

  getCatalogItems(userId: number): Array<FoodCatalogItem & { entries: FoodCatalogEntry[] }> {
    return catalogRepository.getCatalogItems(userId);
  }

  createCatalogItem(userId: number, data: CreateCatalogItem): FoodCatalogItem & { entries: FoodCatalogEntry[] } {
    return catalogRepository.createCatalogItem(userId, data);
  }

  updateCatalogItem(
    userId: number,
    itemId: number,
    data: { name: string; description?: string },
  ): (FoodCatalogItem & { entries: FoodCatalogEntry[] }) | null {
    return catalogRepository.updateCatalogItem(userId, itemId, data);
  }

  deleteCatalogItem(userId: number, itemId: number): void {
    catalogRepository.deleteCatalogItem(userId, itemId);
  }

  // UX-21: persist AI-calculated КБЖУ to a catalog entry
  updateCatalogEntryKbju(
    userId: number,
    entryId: number,
    data: { kcal: number; protein: number; fat: number; carbs: number },
  ): void {
    catalogRepository.updateCatalogEntryKbju(userId, entryId, data);
  }

  saveMealToCatalog(userId: number, mealId: number, name: string): FoodCatalogItem & { entries: FoodCatalogEntry[] } {
    return catalogRepository.saveMealToCatalog(userId, mealId, name);
  }

  // ── Phase 23 — Photos ────────────────────────────────────────────────────────

  savePhoto(data: { id: string; userId: number; mealId?: number | null; s3Key: string; sizeBytes: number }): Photo {
    return photoRepository.savePhoto(data);
  }

  getPhoto(photoId: string): Photo | undefined {
    return photoRepository.getPhoto(photoId);
  }

  getPhotosByMeal(mealId: number): Photo[] {
    return photoRepository.getPhotosByMeal(mealId);
  }

  getPhotosByUser(userId: number): Photo[] {
    return photoRepository.getPhotosByUser(userId);
  }

  deletePhoto(photoId: string): void {
    photoRepository.deletePhoto(photoId);
  }

  countUserPhotos(userId: number): number {
    return photoRepository.countUserPhotos(userId);
  }
  // ── Idempotency Keys (Phase 26.7) ────────────────────────────────────────────
  getIdempotencyKey(key: string, userId: number): { status: number; body: string } | null {
    const row = db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.userId, userId)))
      .get();
    if (!row) return null;
    // Check expiry
    if (new Date(row.expiresAt) < new Date()) {
      db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key)).run();
      return null;
    }
    return { status: row.responseStatus, body: row.responseBody };
  }

  saveIdempotencyKey(key: string, userId: number, status: number, body: string): void {
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h TTL
    db.insert(idempotencyKeys)
      .values({
        key,
        userId,
        responseStatus: status,
        responseBody: body,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      })
      .onConflictDoNothing()
      .run();
  }

  deleteExpiredIdempotencyKeys(): void {
    db.delete(idempotencyKeys)
      .where(sql`${idempotencyKeys.expiresAt} < datetime('now')`)
      .run();
  }

  // ── Phase 24 — Audit Log ───────────────────────────────────────────────────
  async addAuditLog(data: Omit<NewAuditLogEntry, "id" | "createdAt">): Promise<void> {
    return auditRepository.addAuditLog(data);
  }

  async getAuditLog(filters: {
    actorId?: number;
    targetId?: number;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    return auditRepository.getAuditLog(filters);
  }

  // ── Client Error Log ────────────────────────────────────────────────────────

  addClientError(data: {
    userId?: number | null;
    message: string;
    stack?: string | null;
    url?: string | null;
    userAgent?: string | null;
    extra?: string | null;
  }): void {
    // Insert new error
    db.insert(clientErrors)
      .values({
        userId: data.userId ?? null,
        message: data.message.slice(0, 1000),
        stack: data.stack ? data.stack.slice(0, 5000) : null,
        url: data.url ? data.url.slice(0, 500) : null,
        userAgent: data.userAgent ? data.userAgent.slice(0, 300) : null,
        extra: data.extra ? data.extra.slice(0, 2000) : null,
      })
      .run();

    // Retention: delete records older than 7 days
    db.delete(clientErrors)
      .where(sql`${clientErrors.createdAt} < datetime('now', '-7 days')`)
      .run();
  }

  getClientErrors(limit = 200): Array<typeof clientErrors.$inferSelect> {
    return db.select().from(clientErrors).orderBy(desc(clientErrors.createdAt)).limit(limit).all();
  }
}

export const storage = new SqliteStorage();
