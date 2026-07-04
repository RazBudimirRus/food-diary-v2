import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role", { enum: ["user", "doctor", "admin"] })
    .notNull()
    .default("user"),
  pdConsentAt: text("pd_consent_at"), // ISO timestamp when user consented (152-ФЗ)
  createdAt: text("created_at").notNull().default(""),
  lastLoginAt: text("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true });

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export const refreshTokens = sqliteTable("refresh_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(), // SHA-256 hash, never the raw token
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

// ─── Password Reset Tokens ───────────────────────────────────────────────────
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

// ─── App Secrets (encrypted in DB) ───────────────────────────────────────────
// Arbitrary key-value secrets per user (for future integrations)
export const secrets = sqliteTable("secrets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  key: text("key").notNull(),
  encryptedValue: text("encrypted_value").notNull(), // AES-256-GCM encrypted
  iv: text("iv").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
});

// ─── Days ─────────────────────────────────────────────────────────────────────
export const days = sqliteTable("days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD MSK
  wakeTime: text("wake_time"),
  sleepTime: text("sleep_time"),
  wakeDate: text("wake_date"),
  sleepDate: text("sleep_date"),
  sportActivity: text("sport_activity"),
  steps: integer("steps"),
  dayComment: text("day_comment"),
  summaryFilled: integer("summary_filled", { mode: "boolean" }).notNull().default(false),
});

export const insertDaySchema = createInsertSchema(days).omit({ id: true });

// ─── Meals ────────────────────────────────────────────────────────────────────
export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayId: integer("day_id").notNull(),
  userId: integer("user_id").notNull(),
  tsStart: text("ts_start").notNull(),
  tsEnd: text("ts_end"),
  mealType: text("meal_type").notNull(),
  foodText: text("food_text"),
  drinkText: text("drink_text"),
  waterUnits: real("water_units"),
  hungerBefore: integer("hunger_before"),
  satietyAfter: integer("satiety_after"),
  contextNote: text("context_note"),
  source: text("source").notNull().default("web"),
  rawInput: text("raw_input"),
  // КБЖУ — заполняется через DeepSeek анализ
  calories: real("calories"),
  protein: real("protein"),
  fat: real("fat"),
  carbs: real("carbs"),
  createdAt: text("created_at").notNull().default(""),
  deletedAt: text("deleted_at"),
});

export const insertMealSchema = createInsertSchema(meals).omit({ id: true, createdAt: true, deletedAt: true });

// ─── API Usage (DeepSeek monitoring) ──────────────────────────────────────────
export const apiUsage = sqliteTable("api_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  timestamp: text("timestamp").notNull().default(""),
  endpoint: text("endpoint").notNull(),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costEstimate: real("cost_estimate").notNull().default(0),
});

// ─── User Profiles (Фаза 17 — анкета пользователя) ────────────────────────────
export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  gender: text("gender", { enum: ["male", "female", "unspecified"] }).default("unspecified"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  activityLevel: text("activity_level", { enum: ["minimal", "medium", "high"] }).default("medium"),
  targetKcal: real("target_kcal"),
  targetProtein: real("target_protein"),
  targetFat: real("target_fat"),
  targetCarbs: real("target_carbs"),
  onboardingSkipped: integer("onboarding_skipped", { mode: "boolean" }).default(false),
  dietaryRestrictions: text("dietary_restrictions"),
  updatedAt: text("updated_at").notNull().default(""),
});

// ─── Phase 20 — Dietary Restrictions (добавляется через migration в storage.ts) ──
// dietary_restrictions TEXT (JSON) добавляется к user_profiles через ALTER TABLE

// ─── Phase 15 — Doctor Cabinet ────────────────────────────────────────────────
export const doctors = sqliteTable("doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  telegramUrl: text("telegram_url"),
  createdAt: text("created_at").notNull().default(""),
});

export const doctorPatients = sqliteTable("doctor_patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  assignedAt: text("assigned_at").notNull().default(""),
});

export const doctorMealNotes = sqliteTable("doctor_meal_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull(),
  mealId: integer("meal_id").notNull(),
  note: text("note"),
  suggestedKcal: real("suggested_kcal"),
  createdAt: text("created_at").notNull().default(""),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

// ─── Phase 18 — Doctor КБЖУ Plans ─────────────────────────────────────────────
export const doctorPlans = sqliteTable("doctor_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD or null = open-ended
  kcal: real("kcal"),
  protein: real("protein"),
  fat: real("fat"),
  carbs: real("carbs"),
  waterMl: real("water_ml"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

// ─── UX-7 — Food Catalog ──────────────────────────────────────────────────────
export const foodCatalogItems = sqliteTable("food_catalog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSet: integer("is_set", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

export const foodCatalogEntries = sqliteTable("food_catalog_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  catalogItemId: integer("catalog_item_id").notNull(),
  mealName: text("meal_name").notNull(),
  grams: real("grams"),
  kcal: real("kcal"),
  protein: real("protein"),
  fat: real("fat"),
  carbs: real("carbs"),
});

// ─── Phase 23 — Photos ────────────────────────────────────────────────────────
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(), // UUID
  userId: integer("user_id").notNull(),
  mealId: integer("meal_id"), // nullable — фото без привязки к конкретному приёму
  s3Key: text("s3_key").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

// ─── Phase 26.7 — Idempotency Keys ────────────────────────────────────────────
export const idempotencyKeys = sqliteTable("idempotency_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  userId: integer("user_id").notNull(),
  responseStatus: integer("response_status").notNull(),
  responseBody: text("response_body").notNull(),
  createdAt: text("created_at").notNull().default(""),
  expiresAt: text("expires_at").notNull(),
});

// ─── Phase 24 — Audit Log ──────────────────────────────────────────────────────
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: integer("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  targetId: integer("target_id"),
  detail: text("detail"), // JSON string
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
