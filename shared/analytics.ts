/** Pure analytics helpers for nutrition diary (Phase 11). */

export type MealType = "завтрак" | "обед" | "перекус" | "ужин";

export interface AnalyticsMealInput {
  tsStart: string;
  mealType: string;
  calories: number | null;
  hungerBefore: number | null;
  satietyAfter: number | null;
  contextNote: string | null;
}

export interface MealTimingMetrics {
  firstMealTime: string | null;
  lastMealTime: string | null;
  eatingWindowHours: number | null;
  avgGapHours: number | null;
  maxGapHours: number | null;
  lateCaloriesRatio: number | null;
  overeatingCount: number;
  caloriesByMealType: Record<MealType, number>;
  hasKbjuData: boolean;
  greenZoneMeals: number;
  ratedMeals: number;
}

const MEAL_TYPES: MealType[] = ["завтрак", "обед", "перекус", "ужин"];
const LATE_MEAL_MINUTES = 19 * 60;
const LONG_GAP_HOURS = 5;
const SLEEP_GOAL_HOURS = 8;
const SLEEP_DEPRIVED_HOURS = 6;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeToDecimalHours(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyCaloriesByMealType(): Record<MealType, number> {
  return { завтрак: 0, обед: 0, перекус: 0, ужин: 0 };
}

export function computeMealTimingMetrics(meals: AnalyticsMealInput[]): MealTimingMetrics {
  const sorted = [...meals].sort((a, b) => timeToMinutes(a.tsStart) - timeToMinutes(b.tsStart));
  const caloriesByMealType = emptyCaloriesByMealType();
  let totalCalories = 0;
  let lateCalories = 0;
  let overeatingCount = 0;
  let greenZoneMeals = 0;
  let ratedMeals = 0;
  let hasKbjuData = false;

  for (const meal of sorted) {
    const cal = Number(meal.calories ?? 0);
    if (meal.calories != null && cal > 0) {
      hasKbjuData = true;
      totalCalories += cal;
      if (timeToMinutes(meal.tsStart) >= LATE_MEAL_MINUTES) {
        lateCalories += cal;
      }
    }
    if (MEAL_TYPES.includes(meal.mealType as MealType)) {
      caloriesByMealType[meal.mealType as MealType] += cal;
    }
    if (meal.satietyAfter != null && meal.satietyAfter >= 8) {
      overeatingCount += 1;
    }
    if (meal.hungerBefore != null && meal.satietyAfter != null) {
      ratedMeals += 1;
      if (meal.hungerBefore >= 3 && meal.hungerBefore <= 5 && meal.satietyAfter >= 6 && meal.satietyAfter <= 7) {
        greenZoneMeals += 1;
      }
    }
  }

  if (sorted.length === 0) {
    return {
      firstMealTime: null,
      lastMealTime: null,
      eatingWindowHours: null,
      avgGapHours: null,
      maxGapHours: null,
      lateCaloriesRatio: null,
      overeatingCount: 0,
      caloriesByMealType,
      hasKbjuData: false,
      greenZoneMeals: 0,
      ratedMeals: 0,
    };
  }

  const firstMealTime = sorted[0].tsStart;
  const lastMealTime = sorted[sorted.length - 1].tsStart;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    gaps.push(timeToMinutes(sorted[i].tsStart) - timeToMinutes(sorted[i - 1].tsStart));
  }

  const eatingWindowHours = round1((timeToMinutes(lastMealTime) - timeToMinutes(firstMealTime)) / 60);
  const avgGapHours = gaps.length ? round1(gaps.reduce((s, g) => s + g, 0) / gaps.length / 60) : null;
  const maxGapHours = gaps.length ? round1(Math.max(...gaps) / 60) : null;

  return {
    firstMealTime,
    lastMealTime,
    eatingWindowHours: eatingWindowHours >= 0 ? eatingWindowHours : null,
    avgGapHours,
    maxGapHours,
    lateCaloriesRatio: totalCalories > 0 ? round1(lateCalories / totalCalories) : null,
    overeatingCount,
    caloriesByMealType: Object.fromEntries(
      Object.entries(caloriesByMealType).map(([k, v]) => [k, round1(v)]),
    ) as Record<MealType, number>,
    hasKbjuData,
    greenZoneMeals,
    ratedMeals,
  };
}

export function isLongGap(maxGapHours: number | null): boolean {
  return maxGapHours != null && maxGapHours > LONG_GAP_HOURS;
}

export interface AnalyticsDayInput {
  date: string;
  mealsCount: number;
  totalCalories: number;
  sleepDuration: number | null;
  avgHunger: number | null;
  steps: number | null;
  sportActivity: string | null;
}

export function computeSleepDebtSeries(
  days: Array<{ date: string; sleepDuration: number | null }>,
  goalHours = SLEEP_GOAL_HOURS,
): Map<string, number> {
  const result = new Map<string, number>();
  let cumulative = 0;
  for (const day of days) {
    if (day.sleepDuration != null) {
      cumulative += goalHours - day.sleepDuration;
    }
    result.set(day.date, round1(cumulative));
  }
  return result;
}

export function computeRollingAverage(values: number[], window = 7): (number | null)[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1).filter((v) => v > 0);
    if (!slice.length) return null;
    return round1(slice.reduce((s, v) => s + v, 0) / slice.length);
  });
}

function isWeekend(date: string): boolean {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

function hasActivity(sportActivity: string | null): boolean {
  if (!sportActivity) return false;
  const normalized = sportActivity.trim().toLowerCase();
  return normalized !== "" && normalized !== "нет" && normalized !== "no";
}

export function buildHistogram(values: number[]): Record<number, number> {
  const hist: Record<number, number> = {};
  for (let i = 0; i <= 10; i += 1) hist[i] = 0;
  for (const v of values) {
    if (Number.isFinite(v) && v >= 0 && v <= 10) {
      hist[v] = (hist[v] ?? 0) + 1;
    }
  }
  return hist;
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

export function computePeriodInsights(
  days: AnalyticsDayInput[],
  allMeals: AnalyticsMealInput[],
  mealsByDate: Map<string, AnalyticsMealInput[]>,
): PeriodInsights {
  const weekdayCals: number[] = [];
  const weekendCals: number[] = [];
  const withActivityCals: number[] = [];
  const withoutActivityCals: number[] = [];
  const sleepDeprivedCals: number[] = [];
  const normalSleepCals: number[] = [];
  const sleepDeprivedHunger: number[] = [];
  const normalSleepHunger: number[] = [];
  const calorieValues: number[] = [];
  const stepValues: number[] = [];
  const eatingWindows: number[] = [];
  let activityDays = 0;
  let lateDinnerDays = 0;
  let totalOvereating = 0;
  let greenZoneMeals = 0;
  let ratedMeals = 0;

  const contextCounts = new Map<string, number>();
  const hungerValues: number[] = [];
  const satietyValues: number[] = [];
  const calorieDistribution = emptyCaloriesByMealType();
  const mealTypePresence = new Map<MealType, number>();

  for (const type of MEAL_TYPES) mealTypePresence.set(type, 0);

  for (const day of days) {
    if (day.totalCalories > 0) calorieValues.push(day.totalCalories);
    if (day.steps != null && day.steps > 0) stepValues.push(day.steps);
    if (hasActivity(day.sportActivity)) {
      activityDays += 1;
      if (day.totalCalories > 0) withActivityCals.push(day.totalCalories);
    } else if (day.mealsCount > 0) {
      if (day.totalCalories > 0) withoutActivityCals.push(day.totalCalories);
    }

    if (isWeekend(day.date)) {
      if (day.totalCalories > 0) weekendCals.push(day.totalCalories);
    } else if (day.totalCalories > 0) {
      weekdayCals.push(day.totalCalories);
    }

    const deprived = day.sleepDuration != null && day.sleepDuration < SLEEP_DEPRIVED_HOURS;
    if (deprived) {
      if (day.totalCalories > 0) sleepDeprivedCals.push(day.totalCalories);
      if (day.avgHunger != null) sleepDeprivedHunger.push(day.avgHunger);
    } else if (day.sleepDuration != null) {
      if (day.totalCalories > 0) normalSleepCals.push(day.totalCalories);
      if (day.avgHunger != null) normalSleepHunger.push(day.avgHunger);
    }

    const dayMeals = mealsByDate.get(day.date) ?? [];
    const timing = computeMealTimingMetrics(dayMeals);
    totalOvereating += timing.overeatingCount;
    greenZoneMeals += timing.greenZoneMeals;
    ratedMeals += timing.ratedMeals;
    if (timing.eatingWindowHours != null) eatingWindows.push(timing.eatingWindowHours);
    if (timing.lastMealTime && timeToMinutes(timing.lastMealTime) >= 21 * 60) {
      lateDinnerDays += 1;
    }

    for (const type of MEAL_TYPES) {
      calorieDistribution[type] += timing.caloriesByMealType[type];
      if (dayMeals.some((m) => m.mealType === type)) {
        mealTypePresence.set(type, (mealTypePresence.get(type) ?? 0) + 1);
      }
    }
  }

  for (const meal of allMeals) {
    if (meal.hungerBefore != null) hungerValues.push(meal.hungerBefore);
    if (meal.satietyAfter != null) satietyValues.push(meal.satietyAfter);
    const ctx = meal.contextNote?.trim();
    if (ctx) contextCounts.set(ctx, (contextCounts.get(ctx) ?? 0) + 1);
  }

  const avg = (arr: number[]) => (arr.length ? round1(arr.reduce((s, v) => s + v, 0) / arr.length) : null);
  const stdDev = (arr: number[]) => {
    if (arr.length < 2) return null;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    return round1(Math.sqrt(variance));
  };

  const filledDays = days.filter((d) => d.mealsCount > 0).length;
  const skippedMealTypes = MEAL_TYPES.filter((type) => {
    const present = mealTypePresence.get(type) ?? 0;
    return filledDays > 0 && present < filledDays * 0.5;
  });

  return {
    avgCaloriesWeekday: avg(weekdayCals),
    avgCaloriesWeekend: avg(weekendCals),
    avgCaloriesWithActivity: avg(withActivityCals),
    avgCaloriesWithoutActivity: avg(withoutActivityCals),
    avgCaloriesSleepDeprived: avg(sleepDeprivedCals),
    avgCaloriesNormalSleep: avg(normalSleepCals),
    avgHungerSleepDeprived: avg(sleepDeprivedHunger),
    avgHungerNormalSleep: avg(normalSleepHunger),
    topCalorieDays: Array.from(days)
      .filter((d) => d.totalCalories > 0)
      .sort((a, b) => b.totalCalories - a.totalCalories)
      .slice(0, 5)
      .map((d) => ({ date: d.date, totalCalories: d.totalCalories })),
    topContexts: Array.from(contextCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([context, count]) => ({ context, count })),
    hungerHistogram: buildHistogram(hungerValues),
    satietyHistogram: buildHistogram(satietyValues),
    greenZoneRatio: ratedMeals > 0 ? round1(greenZoneMeals / ratedMeals) : 0,
    totalOvereating,
    caloriesStdDev: stdDev(calorieValues),
    avgSteps: avg(stepValues),
    activityDays,
    calorieDistributionByMealType: Object.fromEntries(
      Object.entries(calorieDistribution).map(([k, v]) => [k, round1(v)]),
    ) as Record<MealType, number>,
    skippedMealTypes,
    avgEatingWindowHours: avg(eatingWindows),
    lateDinnerDays,
  };
}

export { LONG_GAP_HOURS, SLEEP_GOAL_HOURS, SLEEP_DEPRIVED_HOURS };
