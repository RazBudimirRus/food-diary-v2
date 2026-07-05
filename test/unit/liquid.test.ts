/**
 * Unit tests for parseLiquidMl and mealWaterMl (BUG-02).
 */
import { describe, expect, it } from "vitest";
import { mealWaterMl, parseLiquidMl } from "../../server/utils/liquid";

describe("parseLiquidMl", () => {
  // ── Explicit ml ───────────────────────────────────────────────────────────
  it("parses '500 мл сока'", () => expect(parseLiquidMl("500 мл сока")).toBe(500));
  it("parses '250мл'", () => expect(parseLiquidMl("250мл")).toBe(250));
  it("parses '200 ml water'", () => expect(parseLiquidMl("200 ml water")).toBe(200));
  it("parses '1000 мл'", () => expect(parseLiquidMl("1000 мл")).toBe(1000));

  // ── Explicit litres ───────────────────────────────────────────────────────
  it("parses '0.5 л чай'", () => expect(parseLiquidMl("0.5 л чай")).toBe(500));
  it("parses '1.5л компота'", () => expect(parseLiquidMl("1.5л компота")).toBe(1500));
  it("parses '2л воды'", () => expect(parseLiquidMl("2л воды")).toBe(2000));
  it("parses '0,5л кофе' (comma decimal)", () => expect(parseLiquidMl("0,5л кофе")).toBe(500));
  it("parses '1 l juice'", () => expect(parseLiquidMl("1 l juice")).toBe(1000));

  // ── Count + vessel ────────────────────────────────────────────────────────
  it("parses '2 стакана воды'", () => expect(parseLiquidMl("2 стакана воды")).toBe(400));
  it("parses '3 кружки чая'", () => expect(parseLiquidMl("3 кружки чая")).toBe(750));
  it("parses '2 чашки кофе'", () => expect(parseLiquidMl("2 чашки кофе")).toBe(400));
  it("parses '2 бутылки воды'", () => expect(parseLiquidMl("2 бутылки воды")).toBe(1000));

  // ── Lone vessel ───────────────────────────────────────────────────────────
  it("parses 'стакан воды'", () => expect(parseLiquidMl("стакан воды")).toBe(200));
  it("parses 'кружка кофе'", () => expect(parseLiquidMl("кружка кофе")).toBe(250));
  it("parses 'бутылка'", () => expect(parseLiquidMl("бутылка")).toBe(500));
  it("parses 'чашка зелёного чая'", () => expect(parseLiquidMl("чашка зелёного чая")).toBe(200));

  // ── Returns null when no volume found ────────────────────────────────────
  it("returns null for 'чай'", () => expect(parseLiquidMl("чай")).toBeNull());
  it("returns null for 'кофе'", () => expect(parseLiquidMl("кофе")).toBeNull());
  it("returns null for 'сок'", () => expect(parseLiquidMl("сок")).toBeNull());
  it("returns null for empty string", () => expect(parseLiquidMl("")).toBeNull());
  it("returns null for null", () => expect(parseLiquidMl(null)).toBeNull());
  it("returns null for undefined", () => expect(parseLiquidMl(undefined)).toBeNull());

  // ── Mixed text ────────────────────────────────────────────────────────────
  it("parses '500 мл апельсинового сока без сахара'", () =>
    expect(parseLiquidMl("500 мл апельсинового сока без сахара")).toBe(500));
  it("parses 'выпил 0.3 л компота'", () => expect(parseLiquidMl("выпил 0.3 л компота")).toBe(300));
});

describe("mealWaterMl", () => {
  it("waterUnits only: 1 unit = 500 ml", () => {
    expect(mealWaterMl(1, null)).toBe(500);
  });

  it("waterUnits only: 2 units = 1000 ml", () => {
    expect(mealWaterMl(2, null)).toBe(1000);
  });

  it("drinkText only: 300 мл сока → 300 ml", () => {
    expect(mealWaterMl(null, "300 мл сока")).toBe(300);
  });

  it("waterUnits + drinkText: 1 unit + 200 мл = 700 ml", () => {
    expect(mealWaterMl(1, "200 мл чая")).toBe(700);
  });

  it("drinkText with no volume → only waterUnits counted", () => {
    expect(mealWaterMl(1, "кофе")).toBe(500);
  });

  it("both null → 0", () => {
    expect(mealWaterMl(null, null)).toBe(0);
  });

  it("both undefined → 0", () => {
    expect(mealWaterMl(undefined, undefined)).toBe(0);
  });

  it("stakan + units: 1 стакан + 1 unit = 200 + 500 = 700 ml", () => {
    expect(mealWaterMl(1, "стакан воды")).toBe(700);
  });
});
