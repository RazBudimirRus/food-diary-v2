/**
 * Phase 35.6 — Shared test helpers / factories
 * Provides isolated in-memory DB setup and common data factories.
 */
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { runMigrations } from "../../server/migrate";

export interface TestEnv {
  app: express.Express;
  server: Server;
}

export interface AuthResponse {
  accessToken: string;
  user: { id: number; username: string; email: string; role: string };
}

/** Spin up an isolated Express app with a fresh SQLite DB. */
export async function createTestApp(suffix = ""): Promise<TestEnv> {
  // Must reset modules so storage.ts re-opens a fresh DB each time.
  // Caller is responsible for vi.resetModules() BEFORE calling this.
  const dbPath = join(tmpdir(), `food-diary-test-${process.pid}-${Date.now()}${suffix}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "test-jwt-secret-32-chars-longenough";
  process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars-xxxx";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";

  runMigrations(dbPath);

  const app = express();
  const server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  return { app, server };
}

/** Register a user and return auth tokens. */
export async function registerUser(
  app: express.Express,
  username: string,
  _role: "user" | "doctor" | "admin" = "user",
): Promise<AuthResponse> {
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
  return res.body as AuthResponse;
}

/** Add a meal and return response body. */
export async function addMeal(app: express.Express, accessToken: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/meals")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      date: "2026-07-04",
      tsStart: "12:00",
      mealType: "обед",
      foodText: "Тестовая еда",
      hungerBefore: 3,
      satietyAfter: 7,
      ...overrides,
    })
    .expect(200);
  return res.body as { meal: { id: number }; day: { id: number } };
}
