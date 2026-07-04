/**
 * Unit tests for meals routes — focus on auth guards and validation.
 * Uses a real in-process Express app with SQLite in tmp dir.
 */
import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

// Mock DeepSeek so no real API calls happen
vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let accessToken: string;

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-meals-unit-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "meals-unit-test-jwt-secret-change-me-32";
  process.env.ENCRYPTION_KEY = "meals-unit-test-encryption-key-32!!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";

  runMigrations(process.env.SQLITE_DB_PATH!);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  // Register and log in a test user
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      username: "meal_tester",
      email: "meal_tester@example.com",
      password: "password123",
      pdConsent: true,
    })
    .expect(200);

  accessToken = res.body.accessToken;
});

afterAll(() => server.close());

describe("GET /api/days/:date — auth guard", () => {
  it("returns 401 without a token", async () => {
    await request(app).get("/api/days/2026-06-25").expect(401);
  });

  it("returns 200 with a valid token", async () => {
    const res = await request(app)
      .get("/api/days/2026-06-25")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toBeDefined();
  });
});

describe("POST /api/meals — validation", () => {
  it("returns 401 without a token", async () => {
    await request(app)
      .post("/api/meals")
      .send({ date: "2026-06-25", tsStart: "12:00", mealType: "обед", foodText: "Каша" })
      .expect(401);
  });

  it("creates a meal with valid data", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2026-06-25",
        tsStart: "12:00",
        mealType: "обед",
        foodText: "Гречка с курицей",
        hungerBefore: 4,
        satietyAfter: 7,
      })
      .expect(200);

    expect(res.body.meal).toBeDefined();
    expect(res.body.meal.id).toBeGreaterThan(0);
    expect(res.body.day).toBeDefined();
  });

  it("rejects meal without required fields", async () => {
    await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ date: "2026-06-25" }) // missing tsStart, mealType
      .expect(400);
  });
});

describe("PATCH /api/meals/:id — update validation", () => {
  let mealId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2026-06-26",
        tsStart: "09:00",
        mealType: "завтрак",
        foodText: "Овсянка",
        hungerBefore: 3,
        satietyAfter: 8,
      })
      .expect(200);
    mealId = res.body.meal.id;
  });

  it("returns 401 without a token", async () => {
    await request(app).patch(`/api/meals/${mealId}`).send({ foodText: "Мюсли" }).expect(401);
  });

  it("updates allowed fields", async () => {
    const res = await request(app)
      .patch(`/api/meals/${mealId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ foodText: "Мюсли с молоком" })
      .expect(200);

    expect(res.body.meal?.foodText ?? res.body.foodText).toContain("Мюсли");
  });

  it("rejects mass-assignment fields like userId", async () => {
    await request(app)
      .patch(`/api/meals/${mealId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId: 999 })
      .expect(400);
  });
});

describe("DELETE /api/meals/:id", () => {
  let mealId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        date: "2026-06-27",
        tsStart: "14:00",
        mealType: "ужин",
        foodText: "Суп",
        hungerBefore: 5,
        satietyAfter: 9,
      })
      .expect(200);
    mealId = res.body.meal.id;
  });

  it("returns 401 without a token", async () => {
    await request(app).delete(`/api/meals/${mealId}`).expect(401);
  });

  it("deletes the meal with a valid token", async () => {
    await request(app).delete(`/api/meals/${mealId}`).set("Authorization", `Bearer ${accessToken}`).expect(200);
  });

  it("returns 404 when deleting a non-existent meal", async () => {
    await request(app).delete("/api/meals/999999").set("Authorization", `Bearer ${accessToken}`).expect(404);
  });
});

describe("GET /api/analyze/available", () => {
  it("returns 401 without a token", async () => {
    await request(app).get("/api/analyze/available").expect(401);
  });

  it("returns availability status with a valid token", async () => {
    const res = await request(app)
      .get("/api/analyze/available")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(typeof res.body.available).toBe("boolean");
  });
});
