/**
 * Phase 35.3 — Unit tests for catalog routes
 * Tests GET /api/catalog, POST /api/catalog, DELETE /api/catalog/:id,
 * POST /api/catalog/from-meal/:mealId
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { runMigrations } from "../../server/migrate";

// Mock deepseek to avoid API calls
vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let accessToken: string;
let csrfToken: string;

async function register(username: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      username,
      email: `${username}@example.com`,
      password: "password123",
      displayName: username,
      pdConsent: true,
    })
    .expect(200);
  return res.body as { accessToken: string; user: { id: number } };
}

async function addMealHelper(token: string, csrf: string) {
  const res = await request(app)
    .post("/api/meals")
    .set("Authorization", `Bearer ${token}`)
    .set("x-csrf-token", csrf)
    .send({
      date: "2026-07-04",
      tsStart: "12:00",
      mealType: "обед",
      foodText: "Тестовая еда",
      hungerBefore: 3,
      satietyAfter: 7,
    })
    .expect(200);
  return res.body as { meal: { id: number } };
}

beforeAll(async () => {
  vi.resetModules();
  const dbPath = join(tmpdir(), `catalog-test-${process.pid}-${Date.now()}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "catalog-test-jwt-secret-32-chars";
  process.env.ENCRYPTION_KEY = "catalog-test-encryption-key-xxxxx";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";

  runMigrations(dbPath);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  const auth = await register("cataloguser");
  accessToken = auth.accessToken;

  // Get CSRF token from /api/auth/me
  const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
  csrfToken = meRes.body.csrfToken as string;
});

afterAll(() => server.close());

describe("GET /api/catalog", () => {
  it("returns 401 without auth", async () => {
    await request(app).get("/api/catalog").expect(401);
  });

  it("returns empty list for new user", async () => {
    const res = await request(app).get("/api/catalog").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.body.items).toEqual([]);
  });
});

describe("POST /api/catalog", () => {
  it("returns 401 without auth", async () => {
    await request(app).post("/api/catalog").send({ name: "Тест" }).expect(401);
  });

  it("creates a catalog item", async () => {
    const res = await request(app)
      .post("/api/catalog")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ name: "Гречка", description: "Крупа" })
      .expect(200);
    expect(res.body.item).toMatchObject({ name: "Гречка" });
  });

  it("returns 400 for empty name", async () => {
    await request(app)
      .post("/api/catalog")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ name: "" })
      .expect(400);
  });

  it("created item appears in GET /api/catalog", async () => {
    const res = await request(app).get("/api/catalog").set("Authorization", `Bearer ${accessToken}`).expect(200);
    const names = (res.body.items as { name: string }[]).map((i) => i.name);
    expect(names).toContain("Гречка");
  });
});

describe("DELETE /api/catalog/:id", () => {
  it("deletes a catalog item", async () => {
    // Create item to delete
    const createRes = await request(app)
      .post("/api/catalog")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ name: "На удаление" })
      .expect(200);
    const itemId = (createRes.body.item as { id: number }).id;

    await request(app)
      .delete(`/api/catalog/${itemId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    // Should no longer appear in list
    const listRes = await request(app).get("/api/catalog").set("Authorization", `Bearer ${accessToken}`).expect(200);
    const ids = (listRes.body.items as { id: number }[]).map((i) => i.id);
    expect(ids).not.toContain(itemId);
  });

  it("returns 401 without auth", async () => {
    await request(app).delete("/api/catalog/1").expect(401);
  });
});

describe("POST /api/catalog/from-meal/:mealId", () => {
  it("saves meal to catalog", async () => {
    const { meal } = await addMealHelper(accessToken, csrfToken);
    const res = await request(app)
      .post(`/api/catalog/from-meal/${meal.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ name: "Моя гречка с курицей" })
      .expect(200);
    expect(res.body.item).toBeDefined();
  });

  it("returns 404 for non-existent meal", async () => {
    await request(app)
      .post("/api/catalog/from-meal/999999")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ name: "тест" })
      .expect(404);
  });

  it("returns 401 without auth", async () => {
    await request(app).post("/api/catalog/from-meal/1").expect(401);
  });
});
