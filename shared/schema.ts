import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  pdConsentAt: text("pd_consent_at"), // ISO timestamp when user consented (152-ФЗ)
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = User["role"];

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Только буквы, цифры и _"),
  email: z.string().email(),
  password: z.string().min(8, "Минимум 8 символов"),
  displayName: z.string().min(1).max(64).optional(),
  pdConsent: z.literal(true, { errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }) }),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

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

export type RefreshToken = typeof refreshTokens.$inferSelect;

// ─── Password Reset Tokens ───────────────────────────────────────────────────
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, "Минимум 8 символов"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

export type Secret = typeof secrets.$inferSelect;

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
export type InsertDay = z.infer<typeof insertDaySchema>;
export type Day = typeof days.$inferSelect;

export const daySummarySchema = z.object({
  wakeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  sleepTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  wakeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  sleepDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  sportActivity: z.string().optional(),
  steps: z.coerce.number().int().min(0).optional().or(z.literal("")),
  dayComment: z.string().optional(),
});
export type DaySummary = z.infer<typeof daySummarySchema>;

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
});

export const insertMealSchema = createInsertSchema(meals).omit({ id: true, createdAt: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

export const addMealSchema = z.object({
  tsStart: z.string().regex(/^\d{2}:\d{2}$/, "Формат ЧЧ:ММ"),
  tsEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  mealType: z.enum(["завтрак", "обед", "перекус", "ужин"]),
  foodText: z.string().optional(),
  drinkText: z.string().optional(),
  waterUnits: z.coerce.number().min(0).optional().or(z.literal("")),
  hungerBefore: z.coerce.number().int().min(0).max(10),
  satietyAfter: z.coerce.number().int().min(0).max(10),
  contextNote: z.string().optional(),
  rawInput: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  // КБЖУ (опционально, если уже посчитано)
  calories: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
});
export type AddMeal = z.infer<typeof addMealSchema>;

export const updateMealSchema = addMealSchema.partial().strict();
export type UpdateMeal = z.infer<typeof updateMealSchema>;

// ─── DeepSeek КБЖУ ────────────────────────────────────────────────────────────
export const analyzeSchema = z.object({
  foodText: z.string().optional(),
  drinkText: z.string().optional(),
});
export type AnalyzeInput = z.infer<typeof analyzeSchema>;

export interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

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

export type ApiUsage = typeof apiUsage.$inferSelect;

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
  updatedAt: text("updated_at").notNull().default(""),
});

export type UserProfile = typeof userProfiles.$inferSelect;

export const upsertUserProfileSchema = z.object({
  gender: z.enum(["male", "female", "unspecified"]).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional().nullable(),
  weightKg: z.coerce.number().min(30).max(300).optional().nullable(),
  activityLevel: z.enum(["minimal", "medium", "high"]).optional(),
  targetKcal: z.coerce.number().min(0).optional().nullable(),
  targetProtein: z.coerce.number().min(0).optional().nullable(),
  targetFat: z.coerce.number().min(0).optional().nullable(),
  targetCarbs: z.coerce.number().min(0).optional().nullable(),
  onboardingSkipped: z.boolean().optional(),
});
export type UpsertUserProfile = z.infer<typeof upsertUserProfileSchema>;

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
export type Doctor = typeof doctors.$inferSelect;

export const doctorPatients = sqliteTable("doctor_patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  assignedAt: text("assigned_at").notNull().default(""),
});
export type DoctorPatient = typeof doctorPatients.$inferSelect;

export const doctorMealNotes = sqliteTable("doctor_meal_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: integer("doctor_id").notNull(),
  mealId: integer("meal_id").notNull(),
  note: text("note"),
  suggestedKcal: real("suggested_kcal"),
  createdAt: text("created_at").notNull().default(""),
});
export type DoctorMealNote = typeof doctorMealNotes.$inferSelect;

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull().default(""),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

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
export type DoctorPlan = typeof doctorPlans.$inferSelect;

export const insertDoctorPlanSchema = z.object({
  patientId: z.number().int(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  kcal: z.coerce.number().min(0).optional().nullable(),
  protein: z.coerce.number().min(0).optional().nullable(),
  fat: z.coerce.number().min(0).optional().nullable(),
  carbs: z.coerce.number().min(0).optional().nullable(),
  waterMl: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});
export type InsertDoctorPlan = z.infer<typeof insertDoctorPlanSchema>;

// ─── UX-7 — Food Catalog ──────────────────────────────────────────────────────
export const foodCatalogItems = sqliteTable("food_catalog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSet: integer("is_set", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(""),
});
export type FoodCatalogItem = typeof foodCatalogItems.$inferSelect;

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
export type FoodCatalogEntry = typeof foodCatalogEntries.$inferSelect;

export const createCatalogItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isSet: z.boolean().optional(),
  entries: z
    .array(
      z.object({
        mealName: z.string().min(1),
        grams: z.coerce.number().optional().nullable(),
        kcal: z.coerce.number().optional().nullable(),
        protein: z.coerce.number().optional().nullable(),
        fat: z.coerce.number().optional().nullable(),
        carbs: z.coerce.number().optional().nullable(),
      }),
    )
    .optional(),
});
export type CreateCatalogItem = z.infer<typeof createCatalogItemSchema>;

// ─── Phase 23 — Photos ────────────────────────────────────────────────────────
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(), // UUID
  userId: integer("user_id").notNull(),
  mealId: integer("meal_id"), // nullable — фото без привязки к конкретному приёму
  s3Key: text("s3_key").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});
export type Photo = typeof photos.$inferSelect;
