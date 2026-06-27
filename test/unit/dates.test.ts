import { describe, expect, it } from "vitest";
import {
  addDays,
  calculateSleepDurationHours,
  getCalendarMonthRange,
  getCalendarWeekRange,
  getCalendarYearRange,
  inferSleepDate,
  iterateDates,
} from "../../shared/dates";

describe("calendar period ranges", () => {
  it("week period starts on Monday", () => {
    const range = getCalendarWeekRange("2026-06-27");
    expect(range.from).toBe("2026-06-22");
    expect(range.to).toBe("2026-06-28");
  });

  it("month period starts on the 1st", () => {
    const range = getCalendarMonthRange("2026-06-27");
    expect(range.from).toBe("2026-06-01");
    expect(range.to).toBe("2026-06-30");
  });

  it("year period starts on January 1", () => {
    const range = getCalendarYearRange("2026-06-27");
    expect(range.from).toBe("2026-01-01");
    expect(range.to).toBe("2026-12-31");
  });

  it("iterates every calendar day in range", () => {
    expect(iterateDates("2026-06-01", "2026-06-03")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });
});

describe("sleep date inference and duration", () => {
  it("infers evening sleep on the diary day", () => {
    expect(inferSleepDate("2026-06-20", "23:30")).toBe("2026-06-20");
  });

  it("infers early-morning sleep on the next calendar day", () => {
    expect(inferSleepDate("2026-06-20", "01:00")).toBe("2026-06-21");
  });

  it("calculates 23:30 to 07:00 as 7.5 hours", () => {
    expect(calculateSleepDurationHours("2026-06-20", "23:30", "07:00")).toBe(7.5);
  });

  it("calculates 01:00 to 09:00 with explicit next-day sleep", () => {
    expect(calculateSleepDurationHours("2026-06-20", "01:00", "09:00", "2026-06-21")).toBe(8);
  });

  it("supports explicit wake date on the next day", () => {
    expect(
      calculateSleepDurationHours("2026-06-20", "23:30", "07:00", "2026-06-20", "2026-06-21"),
    ).toBe(7.5);
  });

  it("adds days in UTC-safe YYYY-MM-DD format", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });
});
