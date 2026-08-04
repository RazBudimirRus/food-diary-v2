import type { MealType } from "@shared/analytics";

export interface AnalyticsDay {
  date: string;
  mealsCount: number;
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  waterLitres: number;
  avgHunger: number | null;
  avgSatiety: number | null;
  sleepDuration: number | null;
  wakeTime: string | null;
  sleepTime: string | null;
  steps: number | null;
  sportActivity: string | null;
  firstMealTime: string | null;
  lastMealTime: string | null;
  eatingWindowHours: number | null;
  avgGapHours: number | null;
  maxGapHours: number | null;
  lateCaloriesRatio: number | null;
  overeatingCount: number;
  hasKbjuData: boolean;
  sleepDebt: number | null;
  rollingAvgCalories7: number | null;
}

export interface PeriodInsights {
  avgCaloriesWeekday: number | null;
  avgCaloriesWeekend: number | null;
  avgCaloriesWithActivity: number | null;
  avgCaloriesWithoutActivity: number | null;
  avgCaloriesSleepDeprived: number | null;
  avgCaloriesNormalSleep: number | null;
  avgHungerSleepDeprived: number | null;
  avgHungerNormalSleep: number | null;
  topCalorieDays: Array<{ date: string; totalCalories: number }>;
  topContexts: Array<{ context: string; count: number }>;
  hungerHistogram: Record<number, number>;
  satietyHistogram: Record<number, number>;
  greenZoneRatio: number;
  totalOvereating: number;
  caloriesStdDev: number | null;
  avgSteps: number | null;
  activityDays: number;
  calorieDistributionByMealType: Record<MealType, number>;
  skippedMealTypes: MealType[];
  avgEatingWindowHours: number | null;
  lateDinnerDays: number;
}

export interface AnalyticsResponse {
  days: AnalyticsDay[];
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

export interface ChartDay extends AnalyticsDay {
  label: string;
  wakeDecimal: number | null;
  sleepDecimal: number | null;
  firstMealDecimal: number | null;
  lastMealDecimal: number | null;
  longGap: boolean;
  filled: boolean;
  kbjuMissing: boolean;
}

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  завтрак: "#16a34a",
  обед: "#3b82f6",
  перекус: "#f59e0b",
  ужин: "#8b5cf6",
};

export const HISTOGRAM_KEYS = Array.from({ length: 11 }, (_, i) => i);
