/**
 * Phase 35.2 — Unit tests for doctor routes
 * Tests auth guards, profile CRUD, patient management, diary access.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { runMigrations } from "../../server/migrate";

vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let doctorToken: string;
let patientToken: string;
let patientId: number;
let adminToken: string;
let doctorUserId: number;
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
  return res.body as { accessToken: string; user: { id: number; role: string } };
}

async function setRole(adminTok: string, csrf: string, userId: number, role: string) {
  await request(app)
    .post(`/api/admin/users/${userId}/set-role`)
    .set("Authorization", `Bearer ${adminTok}`)
    .set("x-csrf-token", csrf)
    .send({ role })
    .expect(200);
}

async function getCsrf(token: string) {
  const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
  return res.body.csrfToken as string;
}

beforeAll(async () => {
  vi.resetModules();
  const dbPath = join(tmpdir(), `doctor-test-${process.pid}-${Date.now()}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "doctor-test-jwt-secret-32-chars!!";
  process.env.ENCRYPTION_KEY = "doctor-test-encryption-key-32-xxx";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";
  // Bootstrap admin via env var (server/index.ts reads this on startup)
  process.env.ADMIN_BOOTSTRAP_USERNAME = "docadmin";
  // Disable VAPID so push-notify endpoint just returns 503
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;

  runMigrations(dbPath);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  // Register admin user, then elevate via direct storage call
  const adminAuth = await register("docadmin");
  adminToken = adminAuth.accessToken;
  // bootstrapAdminByUsername ran at server startup before user existed;
  // call it now directly via the imported storage instance.
  const { storage } = await import("../../server/storage");
  storage.bootstrapAdminByUsername("docadmin");

  // Re-login to get updated token with admin role
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ username: "docadmin", password: "password123" })
    .expect(200);
  adminToken = (loginRes.body as { accessToken: string }).accessToken;
  const adminCsrf2 = await getCsrf(adminToken);

  // Register doctor user
  const doctorAuth = await register("dr_house");
  doctorUserId = doctorAuth.user.id;
  await setRole(adminToken, adminCsrf2, doctorUserId, "doctor");

  // Re-login doctor to get fresh token with updated role
  const drLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "dr_house", password: "password123" })
    .expect(200);
  doctorToken = (drLogin.body as { accessToken: string }).accessToken;
  csrfToken = await getCsrf(doctorToken);

  // Register patient
  const patientAuth = await register("patient_one");
  patientId = patientAuth.user.id;
  patientToken = patientAuth.accessToken;
});

afterAll(() => server.close());

describe("requireDoctor middleware", () => {
  it("GET /api/doctor/profile returns 401 without auth", async () => {
    await request(app).get("/api/doctor/profile").expect(401);
  });

  it("GET /api/doctor/profile returns 403 for regular user", async () => {
    await request(app).get("/api/doctor/profile").set("Authorization", `Bearer ${patientToken}`).expect(403);
  });
});

describe("GET /api/doctor/profile", () => {
  it("returns null profile for doctor without profile", async () => {
    const res = await request(app).get("/api/doctor/profile").set("Authorization", `Bearer ${doctorToken}`).expect(200);
    expect(res.body.doctor).toBeNull();
  });
});

describe("PUT /api/doctor/profile", () => {
  it("creates doctor profile", async () => {
    const res = await request(app)
      .put("/api/doctor/profile")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ fullName: "Доктор Хаус", phone: "+79001234567" })
      .expect(200);
    expect(res.body.doctor).toMatchObject({ fullName: "Доктор Хаус" });
  });

  it("returns 400 without fullName", async () => {
    await request(app)
      .put("/api/doctor/profile")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ phone: "+79001234567" })
      .expect(400);
  });
});

describe("GET /api/doctor/patients", () => {
  it("returns empty list before assigning patients", async () => {
    const res = await request(app)
      .get("/api/doctor/patients")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(res.body.patients).toEqual([]);
  });
});

describe("POST /api/doctor/patients/:id/assign", () => {
  it("assigns a patient to the doctor", async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${patientId}/assign`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(200);
    expect(res.body.doctorPatient).toBeDefined();
  });

  it("allows re-assigning same patient (no unique constraint in schema)", async () => {
    // doctor_patients table has no unique(doctorId, patientId) — duplicate inserts succeed
    await request(app)
      .post(`/api/doctor/patients/${patientId}/assign`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(200);
  });

  it("returns 400 if trying to assign self", async () => {
    await request(app)
      .post(`/api/doctor/patients/${doctorUserId}/assign`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(400);
  });

  it("returns 404 for non-existent user", async () => {
    await request(app)
      .post("/api/doctor/patients/999999/assign")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrfToken)
      .expect(404);
  });
});

describe("GET /api/doctor/patients (after assign)", () => {
  it("returns assigned patients list", async () => {
    const res = await request(app)
      .get("/api/doctor/patients")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    const ids = (res.body.patients as { user: { id: number } }[]).map((p) => p.user.id);
    expect(ids).toContain(patientId);
  });
});

describe("GET /api/doctor/search-users", () => {
  it("returns users matching query", async () => {
    const res = await request(app)
      .get("/api/doctor/search-users?q=patient")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    // Should only return safe fields
    const user = res.body.users[0] as { id: number; username: string };
    expect(user.username).toBeDefined();
    expect((user as any).passwordHash).toBeUndefined();
  });

  it("returns empty for short query (<2 chars)", async () => {
    const res = await request(app)
      .get("/api/doctor/search-users?q=p")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(res.body.users).toEqual([]);
  });
});

describe("GET /api/doctor/patients/:id/diary", () => {
  it("returns diary for assigned patient", async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${patientId}/diary?date=2026-07-04`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    // day may be null (no meals yet), but request succeeds
    expect(res.body).toHaveProperty("meals");
  });

  it("returns 403 for unassigned patient", async () => {
    // Register another user not assigned to doctor
    const other = await register("other_patient");
    await request(app)
      .get(`/api/doctor/patients/${other.user.id}/diary`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(403);
  });
});

describe("DELETE /api/doctor/patients/:id", () => {
  it("removes patient from doctor", async () => {
    // Assign a new patient first
    const extra = await register("patient_extra");
    const extraCsrf = await getCsrf(doctorToken);
    await request(app)
      .post(`/api/doctor/patients/${extra.user.id}/assign`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", extraCsrf)
      .expect(200);

    await request(app)
      .delete(`/api/doctor/patients/${extra.user.id}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", extraCsrf)
      .expect(200);

    const res = await request(app)
      .get("/api/doctor/patients")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    const ids = (res.body.patients as { user: { id: number } }[]).map((p) => p.user.id);
    expect(ids).not.toContain(extra.user.id);
  });
});

describe("POST /api/doctor/patients/:id/notify (Web Push)", () => {
  it("returns 503 when VAPID not configured", async () => {
    const csrf = await getCsrf(doctorToken);
    await request(app)
      .post(`/api/doctor/patients/${patientId}/notify`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrf)
      .send({ title: "Test notification" })
      .expect(503);
  });
});

describe("Doctor КБЖУ plans", () => {
  let planId: number;

  it("POST /api/doctor/patients/:id/plans creates a plan", async () => {
    const csrf = await getCsrf(doctorToken);
    const res = await request(app)
      .post(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrf)
      .send({
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        kcal: 2000,
        protein: 120,
        fat: 70,
        carbs: 200,
        waterMl: 2000,
        notes: "Лёгкий дефицит",
      })
      .expect(200);

    expect(res.body.plan).toMatchObject({
      patientId,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      kcal: 2000,
      protein: 120,
    });
    planId = res.body.plan.id;
  });

  it("GET /api/doctor/patients/:id/plans lists plans for patient", async () => {
    const res = await request(app)
      .get(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);

    expect(res.body.plans.length).toBeGreaterThanOrEqual(1);
    expect(res.body.plans.some((p: { id: number }) => p.id === planId)).toBe(true);
  });

  it("GET /api/user/active-plan returns doctor plan for patient on active date", async () => {
    const res = await request(app)
      .get("/api/user/active-plan?date=2026-07-15")
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.source).toBe("doctor");
    expect(res.body.plan).toMatchObject({
      id: planId,
      kcal: 2000,
      protein: 120,
    });
  });

  it("GET /api/user/active-plan returns null source outside plan dates", async () => {
    const res = await request(app)
      .get("/api/user/active-plan?date=2026-08-15")
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);

    expect(res.body.source).toBe("none");
    expect(res.body.plan).toBeNull();
  });

  it("DELETE /api/doctor/plans/:id removes the plan", async () => {
    const csrf = await getCsrf(doctorToken);
    await request(app)
      .delete(`/api/doctor/plans/${planId}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", csrf)
      .expect(200);

    const list = await request(app)
      .get(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(list.body.plans.some((p: { id: number }) => p.id === planId)).toBe(false);
  });
});
