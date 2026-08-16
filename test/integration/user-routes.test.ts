/**
 * Phase 35 — Integration tests for user profile, dietary restrictions,
 * account deletion, data export, and secrets endpoints.
 * Covers uncovered lines in server/routes/auth.ts (~lines 215-276).
 */
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

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

beforeAll(async () => {
  vi.resetModules();
  const dbPath = join(tmpdir(), `user-routes-test-${process.pid}-${Date.now()}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "user-routes-jwt-secret-32-chars!";
  process.env.ENCRYPTION_KEY = "user-routes-encryption-key-32xxx";
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

  const auth = await register("profileuser");
  accessToken = auth.accessToken;

  const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
  csrfToken = meRes.body.csrfToken as string;
});

afterAll(() => server.close());

// ─── User Profile ────────────────────────────────────────────────────────────

describe("GET /api/user/profile", () => {
  it("returns null profile for new user", async () => {
    const res = await request(app).get("/api/user/profile").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.body.profile).toBeNull();
  });

  it("returns 401 without auth", async () => {
    await request(app).get("/api/user/profile").expect(401);
  });
});

describe("PUT /api/user/profile", () => {
  it("creates user profile", async () => {
    const res = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ displayName: "Тест Юзер", weightKg: 85 })
      .expect(200);
    expect(res.body.profile).toBeDefined();
  });

  it("returns 400 on invalid data", async () => {
    await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ weightKg: "not-a-number" })
      .expect(400);
  });
});

describe("GET /api/user/kbju-targets", () => {
  it("returns 401 without auth", async () => {
    await request(app).get("/api/user/kbju-targets").expect(401);
  });

  it("returns patientLabel and null targets when KBJU norms are unset", async () => {
    const res = await request(app)
      .get("/api/user/kbju-targets")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.patientLabel).toBe("profileuser");
    expect(res.body.targets).toBeNull();
  });

  it("returns the same targets object the PDF generator receives", async () => {
    await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ targetKcal: 2200, targetProtein: 120, targetFat: 70, targetCarbs: 250 })
      .expect(200);

    const res = await request(app)
      .get("/api/user/kbju-targets")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.patientLabel).toBe("profileuser");
    expect(res.body.targets).toEqual({ kcal: 2200, protein: 120, fat: 70, carbs: 250 });
  });
});

// ─── Dietary Restrictions ────────────────────────────────────────────────────

describe("GET /api/user/dietary-restrictions", () => {
  it("returns empty array for new user", async () => {
    const res = await request(app)
      .get("/api/user/dietary-restrictions")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.restrictions).toEqual([]);
  });
});

describe("PUT /api/user/dietary-restrictions", () => {
  it("saves dietary restrictions array", async () => {
    const res = await request(app)
      .put("/api/user/dietary-restrictions")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ restrictions: ["без лактозы", "без глютена"] })
      .expect(200);
    expect(res.body.profile).toBeDefined();
  });

  it("returns restrictions after save", async () => {
    const res = await request(app)
      .get("/api/user/dietary-restrictions")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.restrictions).toContain("без лактозы");
  });

  it("returns 400 when restrictions is not array", async () => {
    await request(app)
      .put("/api/user/dietary-restrictions")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ restrictions: "строка" })
      .expect(400);
  });
});

// ─── GET /api/user/my-doctor ─────────────────────────────────────────────────

describe("GET /api/user/my-doctor", () => {
  it("returns null when no doctor assigned", async () => {
    const res = await request(app).get("/api/user/my-doctor").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.body.doctor).toBeNull();
  });
});

// ─── Data Export (152-ФЗ) ────────────────────────────────────────────────────

describe("GET /api/user/export", () => {
  it("returns JSON attachment with user data", async () => {
    const res = await request(app).get("/api/user/export").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.body).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    await request(app).get("/api/user/export").expect(401);
  });
});

// ─── Secrets ─────────────────────────────────────────────────────────────────

describe("Secrets API", () => {
  it("PUT /api/secrets/:key stores encrypted value", async () => {
    const res = await request(app)
      .put("/api/secrets/my-api-key")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ value: "sk-test-secret-value" })
      .expect(200);
    expect(res.body.key).toBe("my-api-key");
  });

  it("GET /api/secrets lists keys without values", async () => {
    const res = await request(app).get("/api/secrets").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(res.body.keys).toContain("my-api-key");
  });

  it("GET /api/secrets/:key/value decrypts and returns value", async () => {
    const res = await request(app)
      .get("/api/secrets/my-api-key/value")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.value).toBe("sk-test-secret-value");
  });

  it("GET /api/secrets/:key/value returns 404 for unknown key", async () => {
    await request(app)
      .get("/api/secrets/nonexistent-key/value")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("PUT /api/secrets/:key returns 400 when value missing", async () => {
    await request(app)
      .put("/api/secrets/empty-key")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ value: "" })
      .expect(400);
  });
});

// ─── Account Deletion ────────────────────────────────────────────────────────

describe("DELETE /api/user/me", () => {
  it("deletes user account", async () => {
    // Register a throwaway user
    const temp = await register("tempdelete");
    const tempCsrf = (
      await request(app).get("/api/auth/me").set("Authorization", `Bearer ${temp.accessToken}`).expect(200)
    ).body.csrfToken as string;

    await request(app)
      .delete("/api/user/me")
      .set("Authorization", `Bearer ${temp.accessToken}`)
      .set("x-csrf-token", tempCsrf)
      .expect(200);

    // Verify user no longer exists by trying to login
    await request(app).post("/api/auth/login").send({ username: "tempdelete", password: "password123" }).expect(401);
  });
});
