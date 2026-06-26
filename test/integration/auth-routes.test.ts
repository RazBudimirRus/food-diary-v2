import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    displayName?: string | null;
    role: "user" | "admin";
  };
}

let app: express.Express;
let server: Server;

async function registerUser(username: string): Promise<AuthResponse> {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      username,
      email: `${username}@example.com`,
      password: "password123",
      displayName: username,
    })
    .expect(200);

  return res.body as AuthResponse;
}

async function addMeal(accessToken: string, date = "2026-06-26") {
  const res = await request(app)
    .post("/api/meals")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      date,
      tsStart: "12:30",
      mealType: "обед",
      foodText: "Гречка и курица",
      hungerBefore: 4,
      satietyAfter: 7,
    })
    .expect(200);

  return res.body as { meal: { id: number }; day: { id: number } };
}

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-integration-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "integration-test-jwt-secret-change-me-32";
  process.env.ENCRYPTION_KEY = "integration-test-encryption-key-change-me-32";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);
});

afterAll(() => {
  server.close();
});

describe("auth routes", () => {
  it("registers a user, returns an access token, and sets an httpOnly refresh cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "alice",
        email: "alice@example.com",
        password: "password123",
        displayName: "Alice",
      })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.token).toBeUndefined();
    expect(res.headers["set-cookie"].join(";")).toContain("refresh_token=");
    expect(res.headers["set-cookie"].join(";")).toContain("HttpOnly");
  });

  it("refreshes an access token using the refresh cookie", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({
        username: "refresh_user",
        email: "refresh_user@example.com",
        password: "password123",
      })
      .expect(200);

    const refresh = await agent.post("/api/auth/refresh").expect(200);

    expect(refresh.body.accessToken).toEqual(expect.any(String));
    expect(refresh.body.user.username).toBe("refresh_user");
  });

  it("requires a bearer access token for protected routes", async () => {
    await request(app).get("/api/auth/me").expect(401);

    const auth = await registerUser("protected_user");
    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(me.body.username).toBe("protected_user");
  });
});

describe("diary route authorization and validation", () => {
  it("blocks day summary updates across users", async () => {
    const owner = await registerUser("owner_user");
    const intruder = await registerUser("intruder_user");
    const { day } = await addMeal(owner.accessToken);

    await request(app)
      .post(`/api/days/${day.id}/summary`)
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .send({ wakeTime: "08:00", sleepTime: "23:30", steps: 5000 })
      .expect(403);
  });

  it("rejects mass-assignment fields in meal updates", async () => {
    const auth = await registerUser("patch_user");
    const { meal } = await addMeal(auth.accessToken);

    await request(app)
      .patch(`/api/meals/${meal.id}`)
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({ foodText: "Updated", userId: 999, dayId: 999 })
      .expect(400);
  });

  it("allows valid meal updates", async () => {
    const auth = await registerUser("patch_valid_user");
    const { meal } = await addMeal(auth.accessToken);

    const res = await request(app)
      .patch(`/api/meals/${meal.id}`)
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        tsStart: "13:15",
        tsEnd: "13:45",
        mealType: "ужин",
        foodText: "Обновлённая еда",
        drinkText: "Чай",
        waterUnits: 1,
        hungerBefore: 3,
        satietyAfter: 8,
        contextNote: "После прогулки",
        calories: 450,
        protein: 25,
        fat: 12,
        carbs: 55,
      })
      .expect(200);

    expect(res.body.meal.foodText).toBe("Обновлённая еда");
    expect(res.body.meal.tsStart).toBe("13:15");
    expect(res.body.meal.tsEnd).toBe("13:45");
    expect(res.body.meal.mealType).toBe("ужин");
    expect(res.body.meal.drinkText).toBe("Чай");
    expect(res.body.meal.waterUnits).toBe(1);
    expect(res.body.meal.hungerBefore).toBe(3);
    expect(res.body.meal.satietyAfter).toBe(8);
    expect(res.body.meal.contextNote).toBe("После прогулки");
    expect(res.body.meal.calories).toBe(450);
    expect(res.body.meal.protein).toBe(25);
    expect(res.body.meal.fat).toBe(12);
    expect(res.body.meal.carbs).toBe(55);
  });
});

describe("DeepSeek usage limits", () => {
  it("blocks analysis when the daily token limit is reached", async () => {
    const previousLimit = process.env.DEEPSEEK_DAILY_TOKEN_LIMIT;
    process.env.DEEPSEEK_DAILY_TOKEN_LIMIT = "10";
    try {
      const auth = await registerUser("deepseek_limit_user");
      const { storage } = await import("../../server/storage");
      storage.recordApiUsage({
        userId: auth.user.id,
        endpoint: "deepseek",
        tokensIn: 8,
        tokensOut: 2,
        costEstimate: 0.001,
      });

      const res = await request(app)
        .post("/api/analyze")
        .set("Authorization", `Bearer ${auth.accessToken}`)
        .send({ foodText: "Овсянка" })
        .expect(429);

      expect(res.body.error).toBe("DeepSeek daily token limit exceeded");
      expect(res.body.dailyLimitExceeded).toBe(true);
      expect(res.body.todayTokens).toBeGreaterThanOrEqual(10);
    } finally {
      if (previousLimit === undefined) {
        delete process.env.DEEPSEEK_DAILY_TOKEN_LIMIT;
      } else {
        process.env.DEEPSEEK_DAILY_TOKEN_LIMIT = previousLimit;
      }
    }
  });
});

describe("admin routes", () => {
  it("forbids non-admin users from reading active sessions", async () => {
    const auth = await registerUser("admin_forbidden_user");

    await request(app)
      .get("/api/admin/sessions")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(403);
  });

  it("allows admin users to read active sessions", async () => {
    const auth = await registerUser("admin_allowed_user");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(auth.user.username);

    const res = await request(app)
      .get("/api/admin/sessions")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(res.body.sessions).toEqual(expect.any(Array));
    expect(res.body.sessions.some((session: { username: string; role: string }) =>
      session.username === auth.user.username && session.role === "admin"
    )).toBe(true);
  });

  it("allows admin users to list users without password hashes", async () => {
    const auth = await registerUser("admin_list_users");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(auth.user.username);

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(res.body.users).toEqual(expect.any(Array));
    const listedUser = res.body.users.find((user: { username: string }) => user.username === auth.user.username);
    expect(listedUser.role).toBe("admin");
    expect(listedUser.passwordHash).toBeUndefined();
  });

  it("forbids non-admin users from reading DeepSeek usage", async () => {
    const auth = await registerUser("admin_usage_forbidden_user");

    await request(app)
      .get("/api/admin/deepseek/usage")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(403);
  });

  it("allows admin users to read DeepSeek usage summary", async () => {
    const auth = await registerUser("admin_usage_allowed_user");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(auth.user.username);
    storage.recordApiUsage({
      userId: auth.user.id,
      endpoint: "deepseek",
      tokensIn: 100,
      tokensOut: 50,
      costEstimate: 0.001,
    });

    const res = await request(app)
      .get("/api/admin/deepseek/usage")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(res.body.totalRequests).toBeGreaterThanOrEqual(1);
    expect(res.body.totalTokens).toBeGreaterThanOrEqual(150);
    expect(res.body.tokensIn).toBeGreaterThanOrEqual(100);
    expect(res.body.tokensOut).toBeGreaterThanOrEqual(50);
    expect(res.body.byDay).toEqual(expect.any(Array));
    expect(res.body.dailyLimitExceeded).toEqual(expect.any(Boolean));
  });

  it("forbids non-admin users from revoking sessions", async () => {
    const auth = await registerUser("admin_revoke_forbidden_user");

    await request(app)
      .post("/api/admin/sessions/1/revoke")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(403);
  });

  it("allows admins to revoke a single active session", async () => {
    const admin = await registerUser("admin_revoke_single_user");
    const target = await registerUser("target_single_session_user");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(admin.user.username);

    const before = await request(app)
      .get("/api/admin/sessions")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    const targetSession = before.body.sessions.find((session: { username: string; id: number }) =>
      session.username === target.user.username
    );
    expect(targetSession).toBeTruthy();

    await request(app)
      .post(`/api/admin/sessions/${targetSession.id}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    const after = await request(app)
      .get("/api/admin/sessions")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(after.body.sessions.some((session: { id: number }) => session.id === targetSession.id)).toBe(false);
  });

  it("allows admins to revoke all active sessions for a user", async () => {
    const admin = await registerUser("admin_revoke_all_user");
    const target = await registerUser("target_all_sessions_user");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(admin.user.username);

    await request(app)
      .post(`/api/admin/users/${target.user.id}/revoke-sessions`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    const after = await request(app)
      .get("/api/admin/sessions")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(after.body.sessions.some((session: { username: string }) =>
      session.username === target.user.username
    )).toBe(false);
  });

  it("forbids non-admin users from resetting passwords", async () => {
    const auth = await registerUser("admin_reset_forbidden_user");

    await request(app)
      .post(`/api/admin/users/${auth.user.id}/reset-password`)
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .expect(403);
  });

  it("allows admins to reset a user password and revoke their sessions", async () => {
    const admin = await registerUser("admin_reset_allowed_user");
    const target = await registerUser("target_reset_password_user");
    const { storage } = await import("../../server/storage");
    storage.bootstrapAdminByUsername(admin.user.username);

    const reset = await request(app)
      .post(`/api/admin/users/${target.user.id}/reset-password`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(reset.body.user.username).toBe(target.user.username);
    expect(reset.body.temporaryPassword).toEqual(expect.any(String));
    expect(reset.body.temporaryPassword.length).toBeGreaterThanOrEqual(12);

    await request(app)
      .post("/api/auth/login")
      .send({ username: target.user.username, password: "password123" })
      .expect(401);

    await request(app)
      .post("/api/auth/login")
      .send({ username: target.user.username, password: reset.body.temporaryPassword })
      .expect(200);
  });
});
