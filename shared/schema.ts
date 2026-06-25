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
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Только буквы, цифры и _"),
  email: z.string().email(),
  password: z.string().min(8, "Минимум 8 символов"),
  displayName: z.string().min(1).max(64).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

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
  date: text("date").notNull(),             // YYYY-MM-DD MSK
  wakeTime: text("wake_time"),
  sleepTime: text("sleep_time"),
  sportActivity: text("sport_activity"),
  steps: integer("steps"),
  dayComment: text("day_comment"),
  summaryFilled: integer("summary_filled", { mode: "boolean" }).notNull().default(false),
});

export const insertDaySchema = createInsertSchema(days).omit({ id: true });
export type InsertDay = z.infer<typeof insertDaySchema>;
export type Day = typeof days.$inferSelect;

export const daySummarySchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
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
  tsEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  mealType: z.enum(["завтрак", "обед", "перекус", "ужин"]),
  foodText: z.string().optional(),
  drinkText: z.string().optional(),
  waterUnits: z.coerce.number().min(0).optional().or(z.literal("")),
  hungerBefore: z.coerce.number().int().min(0).max(10),
  satietyAfter: z.coerce.number().int().min(0).max(10),
  contextNote: z.string().optional(),
  rawInput: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // КБЖУ (опционально, если уже посчитано)
  calories: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
});
export type AddMeal = z.infer<typeof addMealSchema>;

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
