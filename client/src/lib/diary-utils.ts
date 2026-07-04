// diary-utils.ts — Shared helpers, types, and constants for the Diary page and
// its extracted components (MealCard, MealForm, DaySummary, DateCarousel,
// DayCommentBox). Extracted verbatim from DiaryPage.tsx during the 29.4 refactor.
import type { Meal } from "@shared/schema";

// ── Date helpers ────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export const DAY_NAMES_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

/** Returns "Ср · 25.06" for a given YYYY-MM-DD string */
export function formatDateWithWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const dayOfWeek = DAY_NAMES_SHORT[new Date(`${y}-${m}-${d}T12:00:00Z`).getUTCDay()];
  return `${dayOfWeek} · ${d}.${m}`;
}

export function mskToday(): string {
  // MSK = UTC+3
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export function mskNow(): string {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return now.toISOString().slice(11, 16);
}

export function prevDay(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function nextDay(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Meal type constants ─────────────────────────────────────────────────────

export const MEAL_TYPES = ["завтрак", "обед", "перекус", "ужин"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_COLORS: Record<string, string> = {
  завтрак: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  обед: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  перекус: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ужин: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// ── Hunger labels ────────────────────────────────────────────────────────────

export function hungerLabel(v: number): string {
  const labels: Record<number, string> = {
    0: "0 — Экстремальный голод",
    1: "1 — Сильный голод",
    2: "2 — Ощутимый голод",
    3: "3 — Основательно проголодался",
    4: "4 — Лёгкий голод",
    5: "5 — Нейтрально",
    6: "6 — Лёгкая сытость",
    7: "7 — Комфортная сытость",
    8: "8 — Переел",
    9: "9 — Дискомфорт",
    10: "10 — Экстремальное переедание",
  };
  return labels[v] ?? String(v);
}

export function hungerColor(v: number): string {
  if (v <= 2) return "text-red-500";
  if (v <= 7) return "text-green-600";
  return "text-red-500";
}

// ── КБЖУ result type ──────────────────────────────────────────────────────────
export interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

// ── Add/Edit Meal Form data ───────────────────────────────────────────────────

export interface AddMealFormData {
  date: string;
  tsStart: string;
  tsEnd: string;
  mealType: MealType;
  foodText: string;
  drinkText: string;
  waterUnits: string;
  hungerBefore: number;
  satietyAfter: number;
  contextNote: string;
}

export function defaultForm(): AddMealFormData {
  return {
    date: mskToday(),
    tsStart: mskNow(),
    tsEnd: "",
    mealType: "перекус",
    foodText: "",
    drinkText: "",
    waterUnits: "",
    hungerBefore: 4,
    satietyAfter: 7,
    contextNote: "",
  };
}

export function formFromMeal(meal: Meal, date: string): AddMealFormData {
  return {
    date,
    tsStart: meal.tsStart,
    tsEnd: meal.tsEnd ?? "",
    mealType: meal.mealType as MealType,
    foodText: meal.foodText ?? "",
    drinkText: meal.drinkText ?? "",
    waterUnits: meal.waterUnits != null ? String(meal.waterUnits) : "",
    hungerBefore: meal.hungerBefore ?? 4,
    satietyAfter: meal.satietyAfter ?? 7,
    contextNote: meal.contextNote ?? "",
  };
}
