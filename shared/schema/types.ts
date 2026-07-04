import { z } from "zod";
import {
  users,
  insertUserSchema,
  refreshTokens,
  passwordResetTokens,
  secrets,
  days,
  insertDaySchema,
  meals,
  insertMealSchema,
  apiUsage,
  userProfiles,
  doctors,
  doctorPatients,
  doctorMealNotes,
  pushSubscriptions,
  doctorPlans,
  foodCatalogItems,
  foodCatalogEntries,
  photos,
  auditLog,
} from "./tables";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  daySummarySchema,
  addMealSchema,
  updateMealSchema,
  analyzeSchema,
  upsertUserProfileSchema,
  insertDoctorPlanSchema,
  createCatalogItemSchema,
} from "./validators";

// ─── Users ────────────────────────────────────────────────────────────────────
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = User["role"];

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export type RefreshToken = typeof refreshTokens.$inferSelect;

// ─── Password Reset Tokens ───────────────────────────────────────────────────
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── App Secrets ──────────────────────────────────────────────────────────────
export type Secret = typeof secrets.$inferSelect;

// ─── Days ─────────────────────────────────────────────────────────────────────
export type InsertDay = z.infer<typeof insertDaySchema>;
export type Day = typeof days.$inferSelect;

export type DaySummary = z.infer<typeof daySummarySchema>;

// ─── Meals ────────────────────────────────────────────────────────────────────
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

export type AddMeal = z.infer<typeof addMealSchema>;
export type UpdateMeal = z.infer<typeof updateMealSchema>;

// ─── DeepSeek КБЖУ ────────────────────────────────────────────────────────────
export type AnalyzeInput = z.infer<typeof analyzeSchema>;

export interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

// ─── API Usage ────────────────────────────────────────────────────────────────
export type ApiUsage = typeof apiUsage.$inferSelect;

// ─── User Profiles ────────────────────────────────────────────────────────────
export type UserProfile = typeof userProfiles.$inferSelect;

export type UpsertUserProfile = z.infer<typeof upsertUserProfileSchema>;

// ─── Doctor Cabinet ───────────────────────────────────────────────────────────
export type Doctor = typeof doctors.$inferSelect;
export type DoctorPatient = typeof doctorPatients.$inferSelect;
export type DoctorMealNote = typeof doctorMealNotes.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ─── Doctor КБЖУ Plans ────────────────────────────────────────────────────────
export type DoctorPlan = typeof doctorPlans.$inferSelect;
export type InsertDoctorPlan = z.infer<typeof insertDoctorPlanSchema>;

// ─── Food Catalog ─────────────────────────────────────────────────────────────
export type FoodCatalogItem = typeof foodCatalogItems.$inferSelect;
export type FoodCatalogEntry = typeof foodCatalogEntries.$inferSelect;
export type CreateCatalogItem = z.infer<typeof createCatalogItemSchema>;

// ─── Photos ───────────────────────────────────────────────────────────────────
export type Photo = typeof photos.$inferSelect;

// ─── Audit Log ────────────────────────────────────────────────────────────────
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
