/**
 * Tests for UX-18 (POST /api/meals/:id/analyze-kbju) and
 * UX-21 (POST /api/catalog/:id/calculate-kbju).
 */
import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

// Mock DeepSeek to avoid real API calls
vi.mock("../../server/deepseek", () => ({
  initDeepSeekKey: vi.fn(),
  isDeepSeekAvailable: vi.fn().mockReturnValue(true),
  analyzeNutrition: vi.fn().mockResolvedValue({
    calories: 450,
    protein: 30.5,
    fat: 15.2,
    carbs: 45.0,
    note: "Тестовая оценка",
    usage: { tokensIn: 100, tokensOut: 50, totalTokens: 150, costEstimate: 0.0001 },
  }),
}));

let app: express.Express;
let server: Server;
let accessToken: string;
let csrfToken: string;

async function getCsrf(): Promise<string> {
  const r = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);
  return (r.body as { csrfToken: string }).csrfToken;
}

async function addMeal(): Promise<{ id: number }> {
  const res = await request(app)
    .post("/api/meals")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("x-csrf-token", csrfToken)
    .send({
      date: "2026-07-06",
      tsStart: "12:00",
      mealType: "обед",
      foodText: "Гречка с курицей 200г",
      drinkText: "Чай",
      hungerBefore: 3,
      satietyAfter: 7,
    })
    .expect(200);
  return (res.body as { meal: { id: number } }).meal;
}

async function addCatalogItem(): Promise<{ id: number }> {
  const res = await request(app)
    .post("/api/catalog")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("x-csrf-token", csrfToken)
    .send({
      name: "Гречка тест",
      entries: [{ mealName: "Гречка 200г, курица 100г" }],
    })
    .expect(200);
  return (res.body as { item: { id: number } }).item;
}

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-ux18-21-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "ux18-21-test-jwt-secret-change-me-32!";
  process.env.ENCRYPTION_KEY = "ux18-21-test-encryption-key-32!!!";
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
    .send({
      username: "ux18_tester",
      email: "ux18@example.com",
      password: "password123",
      pdConsent: true,
    })
    .expect(200);

  accessToken = res.body.accessToken;
  csrfToken = await getCsrf();
});

afterAll(() => server.close());

// ── UX-18: POST /api/meals/:id/analyze-kbju ─────────────────────────────────

describe("POST /api/meals/:id/analyze-kbju (UX-18)", () => {
  it("returns 401 without auth", async () => {
    await request(app).post("/api/meals/1/analyze-kbju").expect(401);
  });

  it("returns 404 for non-existent meal", async () => {
    await request(app)
      .post("/api/meals/999999/analyze-kbju")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(404);
  });

  it("analyzes and saves КБЖУ to meal", async () => {
    const meal = await addMeal();

    const res = await request(app)
      .post(`/api/meals/${meal.id}/analyze-kbju`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    expect(res.body.meal).toBeDefined();
    expect(res.body.meal.calories).toBe(450);
    expect(res.body.meal.protein).toBeCloseTo(30.5, 1);
    expect(res.body.meal.fat).toBeCloseTo(15.2, 1);
    expect(res.body.meal.carbs).toBeCloseTo(45.0, 1);
    expect(res.body.note).toBe("Тестовая оценка");
  });

  it("returns 400 for meal without foodText/drinkText", async () => {
    // Create meal with no food/drink text
    const createRes = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({
        date: "2026-07-06",
        tsStart: "08:00",
        mealType: "завтрак",
        hungerBefore: 2,
        satietyAfter: 5,
      })
      .expect(200);
    const emptyMeal = (createRes.body as { meal: { id: number } }).meal;

    await request(app)
      .post(`/api/meals/${emptyMeal.id}/analyze-kbju`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(400);
  });

  it("returns 403 for another user's meal", async () => {
    // Register second user
    const res2 = await request(app)
      .post("/api/auth/register")
      .send({
        username: "ux18_other",
        email: "ux18other@example.com",
        password: "password123",
        pdConsent: true,
      })
      .expect(200);
    const token2: string = res2.body.accessToken;
    // Get CSRF for second user
    const meRes2 = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token2}`);
    const csrfToken2: string = (meRes2.body as { csrfToken: string }).csrfToken;

    const meal = await addMeal();

    await request(app)
      .post(`/api/meals/${meal.id}/analyze-kbju`)
      .set("Authorization", `Bearer ${token2}`)
      .set("x-csrf-token", csrfToken2)
      .expect(403);
  });
});

// ── UX-21: POST /api/catalog/:id/calculate-kbju ─────────────────────────────

describe("POST /api/catalog/:id/calculate-kbju (UX-21)", () => {
  it("returns 401 without auth", async () => {
    await request(app).post("/api/catalog/1/calculate-kbju").expect(401);
  });

  it("returns 404 for non-existent catalog item", async () => {
    await request(app)
      .post("/api/catalog/999999/calculate-kbju")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(404);
  });

  it("calculates and saves КБЖУ to catalog entry", async () => {
    const item = await addCatalogItem();

    const res = await request(app)
      .post(`/api/catalog/${item.id}/calculate-kbju`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    // Endpoint returns { result, note }
    expect(res.body.result).toBeDefined();
    expect(res.body.result.calories).toBe(450);
    expect(res.body.result.protein).toBeCloseTo(30.5, 1);
    expect(res.body.result.fat).toBeCloseTo(15.2, 1);
    expect(res.body.result.carbs).toBeCloseTo(45.0, 1);
    expect(res.body.note).toBe("Тестовая оценка");
  });
});
