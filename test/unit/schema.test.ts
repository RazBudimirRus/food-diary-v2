import { describe, expect, it } from "vitest";
import { addMealSchema, updateMealSchema } from "../../shared/schema";

describe("meal schemas", () => {
  it("accepts a valid meal creation payload", () => {
    const parsed = addMealSchema.safeParse({
      date: "2026-06-26",
      tsStart: "12:30",
      mealType: "обед",
      foodText: "Гречка и курица",
      hungerBefore: 4,
      satietyAfter: 7,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid hunger and time values", () => {
    const parsed = addMealSchema.safeParse({
      tsStart: "25:99",
      mealType: "обед",
      hungerBefore: 11,
      satietyAfter: 7,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects mass-assignment fields on meal updates", () => {
    const parsed = updateMealSchema.safeParse({
      foodText: "Обновлённая еда",
      userId: 999,
      dayId: 999,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts date field on meal updates", () => {
    const parsed = updateMealSchema.safeParse({
      foodText: "Обновлённая еда",
      date: "2026-06-25",
    });

    expect(parsed.success).toBe(true);
  });
});
