import { describe, expect, it } from "vitest";
import {
  computeMealTimingMetrics,
  computePeriodInsights,
  computeRollingAverage,
  computeSleepDebtSeries,
  isLongGap,
  timeToDecimalHours,
} from "@shared/analytics";

describe("computeMealTimingMetrics", () => {
  it("computes eating window and gaps", () => {
    const metrics = computeMealTimingMetrics([
      { tsStart: "08:00", mealType: "завтрак", calories: 300, hungerBefore: 4, satietyAfter: 7, contextNote: null },
      { tsStart: "13:00", mealType: "обед", calories: 600, hungerBefore: 3, satietyAfter: 8, contextNote: "офис" },
      { tsStart: "20:00", mealType: "ужин", calories: 400, hungerBefore: 5, satietyAfter: 6, contextNote: null },
    ]);

    expect(metrics.firstMealTime).toBe("08:00");
    expect(metrics.lastMealTime).toBe("20:00");
    expect(metrics.eatingWindowHours).toBe(12);
    expect(metrics.maxGapHours).toBe(7);
    expect(metrics.lateCaloriesRatio).toBeCloseTo(400 / 1300, 1);
    expect(metrics.overeatingCount).toBe(1);
    expect(metrics.caloriesByMealType.обед).toBe(600);
  });

  it("flags long gaps", () => {
    expect(isLongGap(5.5)).toBe(true);
    expect(isLongGap(4)).toBe(false);
  });
});

describe("computeSleepDebtSeries", () => {
  it("accumulates sleep debt against 8h goal", () => {
    const debt = computeSleepDebtSeries([
      { date: "2026-06-01", sleepDuration: 6 },
      { date: "2026-06-02", sleepDuration: 8 },
      { date: "2026-06-03", sleepDuration: 7 },
    ]);
    expect(debt.get("2026-06-01")).toBe(2);
    expect(debt.get("2026-06-02")).toBe(2);
    expect(debt.get("2026-06-03")).toBe(3);
  });
});

describe("computeRollingAverage", () => {
  it("smooths calorie series", () => {
    expect(computeRollingAverage([0, 1000, 2000], 2)).toEqual([null, 1000, 1500]);
  });
});

describe("computePeriodInsights", () => {
  it("builds weekday/weekend and histogram insights", () => {
    const mealsByDate = new Map([
      ["2026-06-23", [
        { tsStart: "12:00", mealType: "обед", calories: 500, hungerBefore: 2, satietyAfter: 9, contextNote: "спешка" },
      ]],
      ["2026-06-28", [
        { tsStart: "10:00", mealType: "завтрак", calories: 400, hungerBefore: 4, satietyAfter: 7, contextNote: null },
      ]],
    ]);

    const insights = computePeriodInsights(
      [
        { date: "2026-06-23", mealsCount: 1, totalCalories: 500, sleepDuration: 5, avgHunger: 2, steps: 3000, sportActivity: "нет" },
        { date: "2026-06-28", mealsCount: 1, totalCalories: 400, sleepDuration: 8, avgHunger: 4, steps: 10000, sportActivity: "бег" },
      ],
      [...mealsByDate.values()].flat(),
      mealsByDate,
    );

    expect(insights.avgCaloriesWeekday).toBe(500);
    expect(insights.avgCaloriesWeekend).toBe(400);
    expect(insights.totalOvereating).toBe(1);
    expect(insights.topContexts[0]?.context).toBe("спешка");
    expect(insights.hungerHistogram[2]).toBe(1);
    expect(insights.activityDays).toBe(1);
  });
});

describe("timeToDecimalHours", () => {
  it("converts HH:MM to decimal hours", () => {
    expect(timeToDecimalHours("07:30")).toBe(7.5);
    expect(timeToDecimalHours("23:15")).toBe(23.25);
  });
});
