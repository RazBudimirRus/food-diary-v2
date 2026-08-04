/**
 * Phase 29 W0 — MFA route regression tests
 * Covers setup, verify-setup, status, disable, and login with MFA enabled.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import * as OTPAuth from "otpauth";
import { runMigrations } from "../../server/migrate";

vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let doctorToken: string;
let patientToken: string;
let doctorCsrf: string;

function totpFromUri(uri: string): string {
  const parsed = OTPAuth.URI.parse(uri);
  if (!(parsed instanceof OTPAuth.TOTP)) throw new Error("Expected TOTP URI");
  return parsed.generate();
}

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

async function getCsrf(token: string) {
  const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
  return res.body.csrfToken as string;
}

async function setRole(adminTok: string, csrf: string, userId: number, role: string) {
  await request(app)
    .post(`/api/admin/users/${userId}/set-role`)
    .set("Authorization", `Bearer ${adminTok}`)
    .set("x-csrf-token", csrf)
    .send({ role })
    .expect(200);
}

beforeAll(async () => {
  vi.resetModules();
  const dbPath = join(tmpdir(), `mfa-test-${process.pid}-${Date.now()}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "mfa-test-jwt-secret-32-chars!!!!!";
  process.env.ENCRYPTION_KEY = "mfa-test-encryption-key-32-chars!!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";
  process.env.ADMIN_BOOTSTRAP_USERNAME = "mfaadmin";

  runMigrations(dbPath);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  const adminAuth = await register("mfaadmin");
  const { storage } = await import("../../server/storage");
  storage.bootstrapAdminByUsername("mfaadmin");

  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "mfaadmin", password: "password123" })
    .expect(200);
  const adminToken = (adminLogin.body as { accessToken: string }).accessToken;
  const adminCsrf = await getCsrf(adminToken);

  const doctorAuth = await register("mfa_doctor");
  await setRole(adminToken, adminCsrf, doctorAuth.user.id, "doctor");

  const drLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "mfa_doctor", password: "password123" })
    .expect(200);
  doctorToken = (drLogin.body as { accessToken: string }).accessToken;
  doctorCsrf = await getCsrf(doctorToken);

  const patientAuth = await register("mfa_patient");
  patientToken = patientAuth.accessToken;
});

afterAll(() => server.close());

describe("GET /api/auth/mfa/status", () => {
  it("returns 401 without auth", async () => {
    await request(app).get("/api/auth/mfa/status").expect(401);
  });

  it("returns canEnable:false for regular users", async () => {
    const res = await request(app)
      .get("/api/auth/mfa/status")
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    expect(res.body.mfaEnabled).toBe(false);
    expect(res.body.canEnable).toBe(false);
  });

  it("returns canEnable:true for doctor before setup", async () => {
    const res = await request(app)
      .get("/api/auth/mfa/status")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(res.body.mfaEnabled).toBe(false);
    expect(res.body.canEnable).toBe(true);
  });
});

describe("MFA setup lifecycle (doctor)", () => {
  it("POST /api/auth/mfa/setup returns 403 for regular user", async () => {
    await request(app)
      .post("/api/auth/mfa/setup")
      .set("Authorization", `Bearer ${patientToken}`)
      .set("x-csrf-token", await getCsrf(patientToken))
      .expect(403);
  });

  it("POST /api/auth/mfa/setup returns QR data for doctor", async () => {
    const res = await request(app)
      .post("/api/auth/mfa/setup")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .expect(200);
    expect(res.body.qrDataUrl).toMatch(/^data:image/);
    expect(res.body.uri).toMatch(/^otpauth:\/\//);
    expect(res.body.mfaEnabled).toBe(false);
  });

  it("POST /api/auth/mfa/verify-setup activates MFA with valid TOTP", async () => {
    const setup = await request(app)
      .post("/api/auth/mfa/setup")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .expect(200);

    const token = totpFromUri(setup.body.uri as string);
    const res = await request(app)
      .post("/api/auth/mfa/verify-setup")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .send({ token })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.mfaEnabled).toBe(true);

    const status = await request(app)
      .get("/api/auth/mfa/status")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(status.body.mfaEnabled).toBe(true);
  });

  it("login requires TOTP when MFA is enabled", async () => {
    const step1 = await request(app)
      .post("/api/auth/login")
      .send({ username: "mfa_doctor", password: "password123" })
      .expect(202);
    expect(step1.body.mfaRequired).toBe(true);

    const { storage } = await import("../../server/storage");
    const user = storage.getUserByUsername("mfa_doctor");
    expect(user?.mfaEnabled).toBe(true);
    expect(user?.mfaSecret).toBeTruthy();

    const { decryptSecret } = await import("../../server/auth");
    const packed = JSON.parse(user!.mfaSecret!) as { iv: string; enc: string };
    const base32 = decryptSecret(packed.enc, packed.iv);
    const totp = new OTPAuth.TOTP({
      issuer: "Food Diary",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32),
    });
    const code = totp.generate();

    const step2 = await request(app)
      .post("/api/auth/login")
      .send({ username: "mfa_doctor", password: "password123", totp: code })
      .expect(200);
    expect(step2.body.accessToken).toEqual(expect.any(String));
  });

  it("login rejects invalid TOTP when MFA is enabled", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ username: "mfa_doctor", password: "password123", totp: "000000" })
      .expect(401);
  });

  it("POST /api/auth/mfa/disable turns off MFA with valid code", async () => {
    const { storage } = await import("../../server/storage");
    const user = storage.getUserByUsername("mfa_doctor");
    const { decryptSecret } = await import("../../server/auth");
    const packed = JSON.parse(user!.mfaSecret!) as { iv: string; enc: string };
    const base32 = decryptSecret(packed.enc, packed.iv);
    const totp = new OTPAuth.TOTP({
      issuer: "Food Diary",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32),
    });
    const code = totp.generate();

    const res = await request(app)
      .post("/api/auth/mfa/disable")
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .send({ token: code })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.mfaEnabled).toBe(false);

    const status = await request(app)
      .get("/api/auth/mfa/status")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(status.body.mfaEnabled).toBe(false);

    await request(app).post("/api/auth/login").send({ username: "mfa_doctor", password: "password123" }).expect(200);
  });
});
