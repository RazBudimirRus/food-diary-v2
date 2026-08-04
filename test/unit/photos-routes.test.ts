/**
 * Phase 29 W0 — Photos route regression tests
 * Auth guards and S3 unconfigured/mocked success paths.
 */
import express from "express";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../server/migrate";

vi.mock("../../server/s3", () => ({
  isS3Configured: vi.fn(() => false),
  uploadPhoto: vi.fn(async () => 128),
  downloadPhoto: vi.fn(async () => Buffer.from("webp-image-bytes")),
  deleteFromS3: vi.fn(async () => {}),
  buildPhotoKey: vi.fn((userId: number, photoId: string) => `photos/${userId}/2026/01/${photoId}.webp`),
  PHOTO_MAX_SIZE_BYTES: 52428800,
  PHOTO_MAX_PER_USER: 500,
  scanForViruses: vi.fn(async () => {}),
}));

vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let userToken: string;
let photoId: string;

const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
  "base64",
);

beforeAll(async () => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = join(tmpdir(), `photos-test-${process.pid}-${Date.now()}.db`);
  process.env.JWT_SECRET = "photos-test-jwt-secret-32-chars!!";
  process.env.ENCRYPTION_KEY = "photos-test-encryption-key-32!!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  delete process.env.VK_S3_ACCESS_KEY;
  delete process.env.VK_S3_SECRET_KEY;

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
      username: "photo_user",
      email: "photo_user@example.com",
      password: "password123",
      pdConsent: true,
    })
    .expect(200);
  userToken = res.body.accessToken;
});

afterAll(() => server.close());

describe("photos auth guards", () => {
  it("POST /api/photos/upload returns 401 without auth", async () => {
    await request(app).post("/api/photos/upload").attach("photo", TINY_JPEG, "test.jpg").expect(401);
  });

  it("GET /api/photos/:id returns 401 without auth", async () => {
    await request(app).get("/api/photos/some-uuid").expect(401);
  });

  it("DELETE /api/photos/:id returns 401 without auth", async () => {
    await request(app).delete("/api/photos/some-uuid").expect(401);
  });
});

describe("photos when S3 unconfigured", () => {
  it("POST /api/photos/upload returns 503", async () => {
    const res = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("photo", TINY_JPEG, "test.jpg")
      .expect(503);
    expect(res.body.error).toMatch(/S3/i);
  });

  it("GET /api/photos/:id returns 503 with auth", async () => {
    const res = await request(app)
      .get("/api/photos/nonexistent-id")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(503);
    expect(res.body.error).toMatch(/S3/i);
  });

  it("DELETE /api/photos/:id returns 503 with auth", async () => {
    const res = await request(app)
      .delete("/api/photos/nonexistent-id")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(503);
    expect(res.body.error).toMatch(/S3/i);
  });
});

describe("photos with mocked S3 configured", () => {
  beforeAll(async () => {
    const s3 = await import("../../server/s3");
    vi.mocked(s3.isS3Configured).mockReturnValue(true);
  });

  it("uploads a photo and returns metadata", async () => {
    const res = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("photo", TINY_JPEG, "meal.jpg")
      .expect(200);

    expect(res.body.photo.id).toEqual(expect.any(String));
    expect(res.body.photo.userId).toBeGreaterThan(0);
    expect(res.body.photo.s3Key).toMatch(/^photos\//);
    photoId = res.body.photo.id;
  });

  it("GET /api/photos/:id proxies image bytes", async () => {
    const res = await request(app)
      .get(`/api/photos/${photoId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(res.headers["content-type"]).toBe("image/webp");
    expect(Buffer.isBuffer(res.body) || typeof res.body === "object").toBe(true);
  });

  it("GET /api/photos/:id accepts ?token= query param", async () => {
    await request(app).get(`/api/photos/${photoId}?token=${userToken}`).expect(200);
  });

  it("DELETE /api/photos/:id removes photo", async () => {
    await request(app).delete(`/api/photos/${photoId}`).set("Authorization", `Bearer ${userToken}`).expect(200);

    await request(app).get(`/api/photos/${photoId}`).set("Authorization", `Bearer ${userToken}`).expect(404);
  });
});
