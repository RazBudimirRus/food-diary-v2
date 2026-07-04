/**
 * Unit tests for client/src/lib/diary-utils.ts pure functions.
 * These are framework-agnostic helpers with no DOM dependencies.
 */
import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateWithWeekday,
  prevDay,
  nextDay,
  hungerLabel,
  MEAL_TYPES,
  MEAL_TYPE_COLORS,
} from "../../client/src/lib/diary-utils";

describe("formatDate", () => {
  it("converts YYYY-MM-DD to DD.MM.YYYY", () => {
    expect(formatDate("2026-06-25")).toBe("25.06.2026");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatDate("2026-01-05")).toBe("05.01.2026");
  });
});

describe("formatDateWithWeekday", () => {
  it("includes a short day name and the day.month format", () => {
    // 2026-06-25 is a Thursday (Чт)
    const result = formatDateWithWeekday("2026-06-25");
    expect(result).toContain("25.06");
    expect(result).toContain(" · ");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns the correct weekday for a known date", () => {
    // 2026-07-04 is a Saturday (Сб)
    expect(formatDateWithWeekday("2026-07-04")).toContain("Сб");
  });
});

describe("prevDay", () => {
  it("returns the day before", () => {
    expect(prevDay("2026-06-25")).toBe("2026-06-24");
  });

  it("crosses month boundaries", () => {
    expect(prevDay("2026-06-01")).toBe("2026-05-31");
  });

  it("crosses year boundaries", () => {
    expect(prevDay("2026-01-01")).toBe("2025-12-31");
  });
});

describe("nextDay", () => {
  it("returns the day after", () => {
    expect(nextDay("2026-06-25")).toBe("2026-06-26");
  });

  it("crosses month boundaries", () => {
    expect(nextDay("2026-05-31")).toBe("2026-06-01");
  });

  it("crosses year boundaries", () => {
    expect(nextDay("2025-12-31")).toBe("2026-01-01");
  });
});

describe("hungerLabel", () => {
  it("returns a non-empty string for any value 0-10", () => {
    for (let i = 0; i <= 10; i++) {
      const label = hungerLabel(i);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("MEAL_TYPES", () => {
  it("contains the 4 canonical Russian meal types", () => {
    expect(MEAL_TYPES).toContain("завтрак");
    expect(MEAL_TYPES).toContain("обед");
    expect(MEAL_TYPES).toContain("перекус");
    expect(MEAL_TYPES).toContain("ужин");
    expect(MEAL_TYPES).toHaveLength(4);
  });
});

describe("MEAL_TYPE_COLORS", () => {
  it("has CSS class entries for all meal types", () => {
    for (const mealType of MEAL_TYPES) {
      expect(MEAL_TYPE_COLORS[mealType]).toBeTruthy();
      expect(MEAL_TYPE_COLORS[mealType]).toContain("text-");
    }
  });
});

describe("queryClient apiRequest helpers", () => {
  it("setAccessToken and getAccessToken work as a pair", async () => {
    const { setAccessToken, getAccessToken } = await import("../../client/src/lib/queryClient");
    setAccessToken("test-token-abc");
    expect(getAccessToken()).toBe("test-token-abc");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});
