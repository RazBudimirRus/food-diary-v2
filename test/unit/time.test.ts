import { describe, expect, it, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-unit-time-${process.pid}-${Date.now()}.db`);

describe("MSK time helpers", () => {
  it("converts UTC timestamps to the Moscow calendar date", async () => {
    const { getMskDate } = await import("../../server/storage");

    expect(getMskDate(Date.UTC(2026, 0, 1, 20, 59))).toBe("2026-01-01");
    expect(getMskDate(Date.UTC(2026, 0, 1, 21, 0))).toBe("2026-01-02");
  });

  it("returns current Moscow time from Date.now", async () => {
    vi.setSystemTime(new Date("2026-06-26T18:30:00.000Z"));
    const { getMskTime } = await import("../../server/storage");

    expect(getMskTime()).toBe("21:30");

    vi.useRealTimers();
  });
});
