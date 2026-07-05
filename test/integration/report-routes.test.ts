/**
 * Integration tests for Фаза 21 + UX-22 report endpoints:
 *   GET /api/report/week  — Excel for ISO week
 *   GET /api/report/month — Excel for calendar month
 *   GET /api/report/analytics-pdf — PDF analytics export
 *
 * Existing endpoints covered elsewhere:
 *   GET /api/report/:date  — day report (auth-routes.test.ts area)
 *   GET /api/report/range  — range report
 */
import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

vi.mock("../../server/deepseek");
vi.mock("../../server/s3", () => ({
  isS3Configured: vi.fn(() => false),
  uploadPhoto: vi.fn(async () => 1),
  downloadPhoto: vi.fn(async () => Buffer.from("data")),
  deleteFromS3: vi.fn(async () => {}),
  buildPhotoKey: vi.fn((_userId: number, name: string) => `photos/1/2026/01/${name}.webp`),
  PHOTO_MAX_SIZE_BYTES: 52428800,
  PHOTO_MAX_PER_USER: 500,
  scanForViruses: vi.fn(async () => {}),
}));

let app: express.Express;
let server: Server;
let accessToken: string;

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `report-routes-test-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "report-test-jwt-secret-change-me-32";
  process.env.ENCRYPTION_KEY = "report-test-encryption-key-32byte";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";

  runMigrations(process.env.SQLITE_DB_PATH!);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  // Register a test user
  const regRes = await request(app).post("/api/auth/register").send({
    username: "report_tester",
    email: "report_tester@example.com",
    password: "password123",
    displayName: "Report Tester",
    pdConsent: true,
  });
  expect(regRes.status).toBe(200);
  accessToken = regRes.body.accessToken;
});

afterAll(() => {
  server.close();
});

// ── Helper: seed a meal on a given date ──────────────────────────────────────

async function seedMeal(date: string) {
  const res = await request(app).post("/api/meals").set("Authorization", `Bearer ${accessToken}`).send({
    date,
    tsStart: "12:30",
    mealType: "обед",
    foodText: "Тестовый приём пищи",
    hungerBefore: 4,
    satietyAfter: 7,
    calories: 400,
    protein: 30,
    fat: 10,
    carbs: 50,
  });
  expect(res.status).toBe(200);
}

// ── /api/report/week ──────────────────────────────────────────────────────────

describe("GET /api/report/week", () => {
  const SEED_DATE = "2026-06-15"; // Monday of week 2026-06-15 – 2026-06-21

  beforeAll(async () => {
    await seedMeal(SEED_DATE);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/report/week?date=2026-06-15");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid date", async () => {
    const res = await request(app)
      .get("/api/report/week?date=not-a-date")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("returns Excel file for a week with data", async () => {
    const res = await request(app)
      .get(`/api/report/week?date=${SEED_DATE}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const cdWeek = decodeURIComponent(res.headers["content-disposition"]);
    expect(cdWeek).toContain("неделя_");
  });

  it("returns 404 for week with no data", async () => {
    const res = await request(app)
      .get("/api/report/week?date=2020-01-06")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it("defaults to current week when date omitted", async () => {
    // May 404 if current week has no data, but should not 500
    const res = await request(app).get("/api/report/week").set("Authorization", `Bearer ${accessToken}`);
    expect([200, 404]).toContain(res.status);
  });
});

// ── /api/report/month ─────────────────────────────────────────────────────────

describe("GET /api/report/month", () => {
  const SEED_DATE = "2026-05-20";

  beforeAll(async () => {
    await seedMeal(SEED_DATE);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/report/month?date=2026-05-01");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid date", async () => {
    const res = await request(app).get("/api/report/month?date=invalid").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("returns Excel file for a month with data", async () => {
    const res = await request(app)
      .get(`/api/report/month?date=${SEED_DATE}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const cdMonth = decodeURIComponent(res.headers["content-disposition"]);
    expect(cdMonth).toContain("2026-05.xlsx");
  });

  it("returns 404 for month with no data", async () => {
    const res = await request(app)
      .get("/api/report/month?date=2019-03-01")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

// ── /api/report/analytics-pdf ─────────────────────────────────────────────────

describe("GET /api/report/analytics-pdf", () => {
  const FROM = "2026-06-01";
  const TO = "2026-06-15";

  beforeAll(async () => {
    await seedMeal("2026-06-05");
    await seedMeal("2026-06-10");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get(`/api/report/analytics-pdf?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing/invalid dates", async () => {
    const res1 = await request(app)
      .get("/api/report/analytics-pdf?from=invalid&to=2026-06-15")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .get("/api/report/analytics-pdf?from=2026-06-15&to=2026-06-01")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res2.status).toBe(400);
  });

  it("returns 400 when range exceeds 90 days", async () => {
    const res = await request(app)
      .get("/api/report/analytics-pdf?from=2025-01-01&to=2025-12-31")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a range with no records", async () => {
    const res = await request(app)
      .get("/api/report/analytics-pdf?from=2019-01-01&to=2019-01-31")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it("returns a valid PDF for a range with data", async () => {
    const res = await request(app)
      .get(`/api/report/analytics-pdf?from=${FROM}&to=${TO}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");

    // Verify PDF magic bytes
    const buf = res.body as Buffer;
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });
});

// ── /api/report/range — regression check ─────────────────────────────────────

describe("GET /api/report/range (regression)", () => {
  it("still works after phase-21 route additions", async () => {
    await seedMeal("2026-04-15");
    const res = await request(app)
      .get("/api/report/range?from=2026-04-01&to=2026-04-30")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});
