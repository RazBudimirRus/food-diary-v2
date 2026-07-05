/**
 * Unit tests for POST /api/admin/s3-test
 * Mocks server/s3 so no real S3 calls are made.
 */
import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

// Mock S3 module — default all helpers to succeed
vi.mock("../../server/s3", () => ({
  isS3Configured: vi.fn(() => true),
  uploadPhoto: vi.fn(async () => 42),
  downloadPhoto: vi.fn(async () => Buffer.from("test")),
  deleteFromS3: vi.fn(async () => {}),
  buildPhotoKey: vi.fn((userId: number, name: string) => `photos/${userId}/2026/01/${name}.webp`),
  PHOTO_MAX_SIZE_BYTES: 52428800,
  PHOTO_MAX_PER_USER: 500,
  scanForViruses: vi.fn(async () => {}),
}));

vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-s3test-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "s3test-unit-jwt-secret-change-me-32!";
  process.env.ENCRYPTION_KEY = "s3test-unit-encryption-key-32char!!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.VK_S3_ACCESS_KEY = "fake-key";
  process.env.VK_S3_SECRET_KEY = "fake-secret";

  runMigrations(process.env.SQLITE_DB_PATH!);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);

  // Register admin user and promote to admin
  const adminRes = await request(app)
    .post("/api/auth/register")
    .send({ username: "s3admin", email: "s3admin@example.com", password: "password123", pdConsent: true });
  adminToken = adminRes.body.accessToken;

  // Directly set admin role via storage
  const { storage } = await import("../../server/storage");
  const adminUser = storage.getUserByUsername("s3admin");
  if (adminUser) storage.setUserRole(adminUser.id, "admin");

  // Re-login to get token with admin role
  const loginRes = await request(app).post("/api/auth/login").send({ username: "s3admin", password: "password123" });
  adminToken = loginRes.body.accessToken;

  // Register a plain user
  const userRes = await request(app)
    .post("/api/auth/register")
    .send({ username: "s3user", email: "s3user@example.com", password: "password123", pdConsent: true });
  userToken = userRes.body.accessToken;
});

afterAll(() => server.close());

describe("POST /api/admin/s3-test", () => {
  it("returns 401 without token", async () => {
    await request(app).post("/api/admin/s3-test").expect(401);
  });

  it("returns 403 for non-admin user", async () => {
    await request(app).post("/api/admin/s3-test").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("returns 200 with ok:true when all S3 steps succeed", async () => {
    const res = await request(app).post("/api/admin/s3-test").set("Authorization", `Bearer ${adminToken}`).expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.steps.put.ok).toBe(true);
    expect(res.body.steps.get.ok).toBe(true);
    expect(res.body.steps.delete.ok).toBe(true);
    expect(typeof res.body.steps.put.durationMs).toBe("number");
  });

  it("returns 503 when S3 is not configured", async () => {
    const s3 = await import("../../server/s3");
    vi.mocked(s3.isS3Configured).mockReturnValueOnce(false);

    const res = await request(app).post("/api/admin/s3-test").set("Authorization", `Bearer ${adminToken}`).expect(503);

    expect(res.body.ok).toBe(false);
  });

  it("returns 500 with failed put step when uploadPhoto throws", async () => {
    const s3 = await import("../../server/s3");
    vi.mocked(s3.uploadPhoto).mockRejectedValueOnce(new Error("S3 connection refused"));

    const res = await request(app).post("/api/admin/s3-test").set("Authorization", `Bearer ${adminToken}`).expect(500);

    expect(res.body.ok).toBe(false);
    expect(res.body.steps.put.ok).toBe(false);
    expect(res.body.steps.put.detail).toContain("S3 connection refused");
  });
});
