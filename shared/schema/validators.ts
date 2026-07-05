import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, "Минимум 8 символов"),
});

// ─── Days ─────────────────────────────────────────────────────────────────────
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

// ─── Meals ────────────────────────────────────────────────────────────────────
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

export const updateMealSchema = addMealSchema.partial().strict();

// ─── DeepSeek КБЖУ ────────────────────────────────────────────────────────────
export const analyzeSchema = z.object({
  foodText: z.string().optional(),
  drinkText: z.string().optional(),
});

// ─── User Profiles ────────────────────────────────────────────────────────────
export const upsertUserProfileSchema = z.object({
  gender: z.enum(["male", "female", "unspecified"]).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional().nullable(),
  weightKg: z.coerce.number().min(30).max(300).optional().nullable(),
  activityLevel: z.enum(["minimal", "medium", "high"]).optional(),
  targetKcal: z.coerce.number().min(0).optional().nullable(),
  targetProtein: z.coerce.number().min(0).optional().nullable(),
  targetFat: z.coerce.number().min(0).optional().nullable(),
  targetCarbs: z.coerce.number().min(0).optional().nullable(),
  kbjuManual: z.boolean().optional(),
  onboardingSkipped: z.boolean().optional(),
});

// ─── Doctor Plans ─────────────────────────────────────────────────────────────
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

// ─── Food Catalog ─────────────────────────────────────────────────────────────
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
