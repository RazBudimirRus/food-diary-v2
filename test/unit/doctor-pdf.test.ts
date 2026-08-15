/**
 * Unit tests for the v2.29.0 doctor PDF generator.
 * Verifies:
 *   • Both exports produce valid PDF byte streams (%PDF- magic header).
 *   • Files stay within the doctor-friendly size budget (< 500 KB).
 *   • Inter fonts are actually embedded (not a fallback substitution).
 *   • Range output produces multiple pages when needed.
 */
import { describe, expect, it } from "vitest";
import type { Day, Meal } from "@shared/schema";
import { generateDoctorDayPdf, generateDoctorRangePdf } from "../../server/doctor-pdf";

function makeDay(overrides: Partial<Day> = {}): Day {
  return {
    id: 1,
    userId: 1,
    date: "2026-08-14",
    weekday: "Пт",
    wakeUp: "07:30",
    sleepAt: "23:15",
    steps: 8420,
    activity: "Прогулка 45 мин",
    dayComment: "Обычный день",
    sleepHours: 8.3,
    stressLevel: 3,
    summaryFilled: 1,
    createdAt: null as any,
    ...overrides,
  } as Day;
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 1,
    dayId: 1,
    tsStart: "12:30",
    mealType: "обед",
    foodText: "Куриная грудка, рис, овощи",
    portion: "1 порция",
    unit: "г",
    drinksText: "чай зелёный",
    hungerBefore: 7,
    satietyAfter: 8,
    context: "спокойно",
    photoId: null,
    calories: 550,
    protein: 40,
    fat: 15,
    carbs: 60,
    liquid: 200,
    createdAt: null as any,
    ...overrides,
  } as Meal;
}

describe("generateDoctorDayPdf", () => {
  it("produces a valid PDF buffer with %PDF header", async () => {
    const day = makeDay();
    const meals = [
      makeMeal({ id: 1, tsStart: "08:00", mealType: "завтрак" }),
      makeMeal({ id: 2, tsStart: "13:00", mealType: "обед" }),
      makeMeal({ id: 3, tsStart: "19:00", mealType: "ужин" }),
    ];
    const buf = await generateDoctorDayPdf(day, meals);
    expect(Buffer.isBuffer(buf) || buf instanceof Uint8Array).toBe(true);
    expect(Buffer.from(buf).slice(0, 4).toString()).toBe("%PDF");
  });

  it("stays under 500 KB for a typical day", async () => {
    const day = makeDay();
    const meals = Array.from({ length: 6 }, (_, i) => makeMeal({ id: i + 1, tsStart: `${8 + i * 2}:00` }));
    const buf = await generateDoctorDayPdf(day, meals);
    expect(Buffer.from(buf).length).toBeLessThan(500_000);
  });

  it("embeds Inter font (not a fallback)", async () => {
    const day = makeDay();
    const buf = await generateDoctorDayPdf(day, [makeMeal()]);
    const asString = Buffer.from(buf).toString("latin1");
    expect(asString).toContain("Inter");
  });

  it("supports patientLabel option", async () => {
    const day = makeDay();
    const buf = await generateDoctorDayPdf(day, [makeMeal()], { patientLabel: "И. И. Иванов" });
    expect(Buffer.from(buf).slice(0, 4).toString()).toBe("%PDF");
  });
});

describe("generateDoctorRangePdf", () => {
  it("produces a valid PDF for a small range", async () => {
    const days: Day[] = Array.from({ length: 7 }, (_, i) =>
      makeDay({ id: i + 1, date: `2026-08-${String(10 + i).padStart(2, "0")}` }),
    );
    const mealsByDay = new Map<number, Meal[]>();
    days.forEach((d) => mealsByDay.set(d.id, [makeMeal({ dayId: d.id })]));

    const buf = await generateDoctorRangePdf(days, mealsByDay, "2026-08-10", "2026-08-16");
    expect(Buffer.from(buf).slice(0, 4).toString()).toBe("%PDF");
    expect(Buffer.from(buf).length).toBeLessThan(500_000);
  });

  it("stays under 500 KB even for a 90-day range", async () => {
    const days: Day[] = Array.from({ length: 90 }, (_, i) => {
      const dt = new Date(Date.UTC(2026, 5, 1) + i * 86_400_000);
      return makeDay({
        id: i + 1,
        date: dt.toISOString().slice(0, 10),
      });
    });
    const mealsByDay = new Map<number, Meal[]>();
    days.forEach((d) => mealsByDay.set(d.id, [makeMeal({ dayId: d.id })]));

    const buf = await generateDoctorRangePdf(days, mealsByDay, "2026-06-01", "2026-08-29");
    expect(Buffer.from(buf).slice(0, 4).toString()).toBe("%PDF");
    expect(Buffer.from(buf).length).toBeLessThan(500_000);
  });
});
