/**
 * Unit tests for server/routes/helpers.ts pure functions
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runMigrations } from "../../server/migrate";

// Must be set before any server module is imported (storage.ts opens DB at load time)
const dbPath = join(tmpdir(), `food-diary-helpers-unit-${process.pid}-${Date.now()}.db`);
process.env.SQLITE_DB_PATH = dbPath;
process.env.JWT_SECRET = "helpers-unit-test-jwt-secret-change-me";
process.env.ENCRYPTION_KEY = "helpers-unit-test-enckey-change-me-32";
runMigrations(dbPath);

describe("paramValue", () => {
  it("returns the value when given a string", async () => {
    const { paramValue } = await import("../../server/routes/helpers");
    expect(paramValue("hello")).toBe("hello");
  });

  it("returns the first element when given an array", async () => {
    const { paramValue } = await import("../../server/routes/helpers");
    expect(paramValue(["first", "second"])).toBe("first");
  });

  it("returns empty string when given undefined", async () => {
    const { paramValue } = await import("../../server/routes/helpers");
    expect(paramValue(undefined)).toBe("");
  });
});

describe("readPositiveNumber", () => {
  it("parses a valid positive integer", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber("42", 10)).toBe(42);
  });

  it("parses a valid positive float", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber("3.14", 1)).toBe(3.14);
  });

  it("returns fallback for zero", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber("0", 5)).toBe(5);
  });

  it("returns fallback for negative number", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber("-10", 5)).toBe(5);
  });

  it("returns fallback for NaN input", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber("abc", 7)).toBe(7);
  });

  it("returns fallback for undefined", async () => {
    const { readPositiveNumber } = await import("../../server/routes/helpers");
    expect(readPositiveNumber(undefined, 3)).toBe(3);
  });
});

describe("isDateString", () => {
  it("returns true for a valid YYYY-MM-DD string", async () => {
    const { isDateString } = await import("../../server/routes/helpers");
    expect(isDateString("2026-06-25")).toBe(true);
  });

  it("returns true for boundary dates", async () => {
    const { isDateString } = await import("../../server/routes/helpers");
    expect(isDateString("2000-01-01")).toBe(true);
    expect(isDateString("9999-12-31")).toBe(true);
  });

  it("returns false for invalid formats", async () => {
    const { isDateString } = await import("../../server/routes/helpers");
    expect(isDateString("25-06-2026")).toBe(false);
    expect(isDateString("2026/06/25")).toBe(false);
    expect(isDateString("2026-6-25")).toBe(false);
    expect(isDateString("not-a-date")).toBe(false);
    expect(isDateString("")).toBe(false);
  });

  it("returns false for non-string values", async () => {
    const { isDateString } = await import("../../server/routes/helpers");
    expect(isDateString(null)).toBe(false);
    expect(isDateString(undefined)).toBe(false);
    expect(isDateString(20260625)).toBe(false);
    expect(isDateString({})).toBe(false);
  });
});

describe("daysBetween", () => {
  it("returns 1 for the same date", async () => {
    const { daysBetween } = await import("../../server/routes/helpers");
    expect(daysBetween("2026-06-25", "2026-06-25")).toBe(1);
  });

  it("counts inclusive days correctly", async () => {
    const { daysBetween } = await import("../../server/routes/helpers");
    // Jun 25 → Jun 27 = 3 days inclusive
    expect(daysBetween("2026-06-25", "2026-06-27")).toBe(3);
  });

  it("handles month boundaries", async () => {
    const { daysBetween } = await import("../../server/routes/helpers");
    expect(daysBetween("2026-01-30", "2026-02-01")).toBe(3);
  });

  it("handles year boundaries", async () => {
    const { daysBetween } = await import("../../server/routes/helpers");
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(2);
  });
});

describe("publicUser", () => {
  it("strips sensitive fields and returns only public fields", async () => {
    const { publicUser } = await import("../../server/routes/helpers");
    const result = publicUser({
      id: 1,
      username: "alice",
      email: "alice@example.com",
      displayName: "Alice",
      role: "user",
      createdAt: "2026-01-01",
      lastLoginAt: null,
    });
    expect(result).toEqual({
      id: 1,
      username: "alice",
      email: "alice@example.com",
      displayName: "Alice",
      role: "user",
      createdAt: "2026-01-01",
      lastLoginAt: null,
    });
    // Must not include password hash or other sensitive data
    expect("passwordHash" in result).toBe(false);
  });

  it("handles missing optional fields gracefully", async () => {
    const { publicUser } = await import("../../server/routes/helpers");
    const result = publicUser({
      id: 2,
      username: "bob",
      email: "bob@example.com",
      role: "admin",
    });
    expect(result.id).toBe(2);
    expect(result.displayName).toBeUndefined();
    expect(result.createdAt).toBeUndefined();
  });
});

describe("forgotPasswordResponse", () => {
  it("is ok=true with a safe message that does not reveal user existence", async () => {
    const { forgotPasswordResponse } = await import("../../server/routes/helpers");
    expect(forgotPasswordResponse.ok).toBe(true);
    expect(forgotPasswordResponse.message).toBeTruthy();
    // The message must not say "not found" or "doesn't exist"
    expect(forgotPasswordResponse.message.toLowerCase()).not.toContain("not found");
    expect(forgotPasswordResponse.message.toLowerCase()).not.toContain("не найден");
  });
});

describe("generateTemporaryPassword", () => {
  it("returns a non-empty string", async () => {
    const { generateTemporaryPassword } = await import("../../server/routes/helpers");
    const pw = generateTemporaryPassword();
    expect(typeof pw).toBe("string");
    expect(pw.length).toBeGreaterThan(0);
  });

  it("returns unique values on each call", async () => {
    const { generateTemporaryPassword } = await import("../../server/routes/helpers");
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });
});
