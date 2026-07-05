/**
 * Tests for UX-17 (idempotency key), UX-19 (photos), UX-20 (kbju_manual auto-calc).
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
  isS3Configured: vi.fn(() => true),
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
let userId: number;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-ux-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "ux-test-jwt-secret-change-me-32chars";
  process.env.ENCRYPTION_KEY = "ux-test-encryption-key-32chars!!!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";

  runMigrations(process.env.SQLITE_DB_PATH!);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  const res = await request(app)
    .post("/api/auth/register")
    .send({ username: "ux_tester", email: "ux@example.com", password: "password123", pdConsent: true })
    .expect(200);

  accessToken = res.body.accessToken;
  userId = res.body.user?.id ?? 1;
});

afterAll(() => server.close());

// ─── UX-17: Idempotency key for POST /api/meals ───────────────────────────

describe("UX-17 — Idempotency key (POST /api/meals)", () => {
  const mealPayload = {
    date: "2026-07-05",
    tsStart: "12:00",
    mealType: "обед",
    foodText: "Тест идемпотентности",
    hungerBefore: 5,
    satietyAfter: 7,
  };

  it("creates a meal without an idempotency key", async () => {
    const res = await request(app).post("/api/meals").set("Authorization", `Bearer ${accessToken}`).send(mealPayload);
    expect(res.status).toBe(200);

    expect(res.body.meal).toBeDefined();
    expect(res.body.meal.foodText).toBe("Тест идемпотентности");
  });

  it("returns the same response for repeated requests with the same idempotency key", async () => {
    const iKey = `test-ikey-${Date.now()}`;
    const payload = { ...mealPayload, tsStart: "13:00", foodText: "Идемпотентный приём" };

    const first = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("idempotency-key", iKey)
      .send(payload)
      .expect(200);

    const mealId = first.body.meal.id;

    const second = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("idempotency-key", iKey)
      .send(payload)
      .expect(200);

    // Same meal ID — no duplicate created
    expect(second.body.meal.id).toBe(mealId);
  });

  it("different idempotency keys create separate meals", async () => {
    const payload = { ...mealPayload, tsStart: "14:00", foodText: "Разные ключи" };

    const r1 = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("idempotency-key", `key-a-${Date.now()}`)
      .send(payload)
      .expect(200);

    const r2 = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("idempotency-key", `key-b-${Date.now()}`)
      .send({ ...payload, tsStart: "14:30" })
      .expect(200);

    expect(r1.body.meal.id).not.toBe(r2.body.meal.id);
  });
});

// ─── UX-19: Photos endpoints ───────────────────────────────────────────────

describe("UX-19 — Photo endpoints", () => {
  let mealId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2026-07-05",
        tsStart: "15:00",
        mealType: "ужин",
        foodText: "Еда с фото",
        hungerBefore: 3,
        satietyAfter: 8,
      })
      .expect(200);
    mealId = res.body.meal.id;
  });

  it("GET /api/meals/:id/photos returns 401 without token", async () => {
    await request(app).get(`/api/meals/${mealId}/photos`).expect(401);
  });

  it("GET /api/meals/:id/photos returns empty array for new meal", async () => {
    const res = await request(app)
      .get(`/api/meals/${mealId}/photos`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.photos)).toBe(true);
  });

  it("GET /api/meals/:id/photos returns 404 for non-existent meal", async () => {
    await request(app).get("/api/meals/999999/photos").set("Authorization", `Bearer ${accessToken}`).expect(404);
  });
});

// ─── UX-20: kbju_manual flag and Mifflin auto-calc ────────────────────────

describe("UX-20 — kbju_manual and auto-calc", () => {
  it("sets kbju_manual=true when КБЖУ fields are explicitly set", async () => {
    const res = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        gender: "male",
        heightCm: 180,
        weightKg: 85,
        activityLevel: "medium",
        targetKcal: 2500,
        targetProtein: 180,
        targetFat: 80,
        targetCarbs: 270,
      })
      .expect(200);

    expect(res.body.profile.kbjuManual).toBe(true);
    expect(res.body.profile.targetKcal).toBe(2500);
  });

  it("auto-calculates КБЖУ when kbju_manual=false and anthropometrics change", async () => {
    // First reset to manual=false
    await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ kbjuManual: false })
      .expect(200);

    // Now update anthropometrics only — should trigger auto-calc
    const res = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        gender: "male",
        heightCm: 175,
        weightKg: 80,
        activityLevel: "medium",
      })
      .expect(200);

    // Auto-calc should have populated targetKcal
    expect(res.body.profile.targetKcal).toBeGreaterThan(0);
    // kbjuManual should remain false (auto-calc mode)
    expect(res.body.profile.kbjuManual).toBe(false);
  });

  it("protects manual КБЖУ when kbju_manual=true and anthropometrics change", async () => {
    // Set manual КБЖУ with explicit values
    await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        gender: "male",
        heightCm: 175,
        weightKg: 80,
        activityLevel: "medium",
        targetKcal: 9999,
        targetProtein: 999,
        targetFat: 99,
        targetCarbs: 299,
      })
      .expect(200);

    // Now change only anthropometrics — manual values should NOT be overwritten
    const res = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ weightKg: 78 })
      .expect(200);

    // kbjuManual is still true → no auto-calc → original value preserved
    expect(res.body.profile.kbjuManual).toBe(true);
    expect(res.body.profile.targetKcal).toBe(9999);
  });

  it("calculates correct Mifflin-St Jeor for female profile", async () => {
    // Register separate female user to avoid state pollution
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ username: "ux20_female", email: "ux20f@example.com", password: "password123", pdConsent: true })
      .expect(200);
    const femToken = regRes.body.accessToken;

    const res = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${femToken}`)
      .send({
        gender: "female",
        heightCm: 165,
        weightKg: 60,
        activityLevel: "medium",
      })
      .expect(200);

    // Female Mifflin: 10*60 + 6.25*165 - 5*30 - 161 = 600+1031.25-150-161 = 1320.25 → BMR ≈ 1320
    // TDEE = round(1320.25 * 1.55) = 2046
    expect(res.body.profile.targetKcal).toBeGreaterThan(1800);
    expect(res.body.profile.targetKcal).toBeLessThan(2300);
    expect(res.body.profile.kbjuManual).toBe(false);
  });
});
