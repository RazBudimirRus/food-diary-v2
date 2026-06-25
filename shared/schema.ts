import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tgUserId: text("tg_user_id").unique(),   // Telegram user id (string)
  tgUsername: text("tg_username"),
  webToken: text("web_token").unique(),     // simple static token for web form
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Days ─────────────────────────────────────────────────────────────────────
// One row per calendar day (MSK date: YYYY-MM-DD).
// Day summary fields collected once before first export.
export const days = sqliteTable("days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),             // YYYY-MM-DD MSK
  // Summary (filled once before report download)
  wakeTime: text("wake_time"),              // HH:MM
  sleepTime: text("sleep_time"),            // HH:MM
  sportActivity: text("sport_activity"),   // free text or "нет"
  steps: integer("steps"),
  dayComment: text("day_comment"),          // общий комментарий дня
  summaryFilled: integer("summary_filled", { mode: "boolean" }).notNull().default(false),
});

export const insertDaySchema = createInsertSchema(days).omit({ id: true });
export type InsertDay = z.infer<typeof insertDaySchema>;
export type Day = typeof days.$inferSelect;

export const daySummarySchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, "Формат ЧЧ:ММ").optional().or(z.literal("")),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, "Формат ЧЧ:ММ").optional().or(z.literal("")),
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
  // Time stored as HH:MM MSK; interval = tsStart + "-" + tsEnd
  tsStart: text("ts_start").notNull(),      // HH:MM
  tsEnd: text("ts_end"),                    // HH:MM (optional, can be same)
  mealType: text("meal_type").notNull(),    // завтрак|обед|перекус|ужин
  foodText: text("food_text"),              // что ел
  drinkText: text("drink_text"),            // что пил
  waterUnits: real("water_units"),          // кол-во "вод" (1 вода = 0.5 л)
  hungerBefore: integer("hunger_before"),   // 0–10
  satietyAfter: integer("satiety_after"),   // 0–10
  contextNote: text("context_note"),        // контекст приёма
  source: text("source").notNull().default("web"), // web | telegram
  rawInput: text("raw_input"),              // исходный текст от пользователя
  createdAt: text("created_at").notNull().default(""),
});

export const insertMealSchema = createInsertSchema(meals).omit({ id: true, createdAt: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

// Schema for the quick-add form (no dayId/userId — assigned by backend)
export const addMealSchema = z.object({
  tsStart: z.string().regex(/^\d{2}:\d{2}$/, "Формат ЧЧ:ММ"),
  tsEnd: z.string().regex(/^\d{2}:\d{2}$/, "Формат ЧЧ:ММ").optional().or(z.literal("")),
  mealType: z.enum(["завтрак", "обед", "перекус", "ужин"]),
  foodText: z.string().optional(),
  drinkText: z.string().optional(),
  waterUnits: z.coerce.number().min(0).optional().or(z.literal("")),
  hungerBefore: z.coerce.number().int().min(0).max(10),
  satietyAfter: z.coerce.number().int().min(0).max(10),
  contextNote: z.string().optional(),
  rawInput: z.string().optional(),
  // date override for retrospective entry (YYYY-MM-DD MSK, defaults to today)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AddMeal = z.infer<typeof addMealSchema>;
