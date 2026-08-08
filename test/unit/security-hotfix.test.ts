/**
 * Security hotfixes (code review v2.27.1):
 * - no passwordHash/mfaSecret in API responses / export
 * - doctor assignment checks (notes/plans/notify/photos)
 * - meal notes + photo mealId ownership
 * - account delete cascade
 * - prod error sanitizer
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import express from "express";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { runMigrations } from "../../server/migrate";

const deleteFromS3 = vi.fn(async () => {});

vi.mock("../../server/s3", () => ({
  isS3Configured: vi.fn(() => true),
  uploadPhoto: vi.fn(async () => 128),
  downloadPhoto: vi.fn(async () => Buffer.from("webp-image-bytes")),
  deleteFromS3,
  buildPhotoKey: vi.fn((userId: number, photoId: string) => `photos/${userId}/2026/01/${photoId}.webp`),
  PHOTO_MAX_SIZE_BYTES: 52428800,
  PHOTO_MAX_PER_USER: 500,
  scanForViruses: vi.fn(async () => {}),
}));

vi.mock("../../server/deepseek");

let app: express.Express;
let server: Server;
let storage: typeof import("../../server/storage").storage;

let adminToken: string;
let doctorToken: string;
let doctorCsrf: string;
let doctorUserId: number;
let patientToken: string;
let patientId: number;
let otherUserToken: string;
let otherUserId: number;
let unassignedDoctorToken: string;
let unassignedDoctorCsrf: string;

const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
  "base64",
);

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

async function getCsrf(token: string) {
  const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
  return res.body.csrfToken as string;
}

async function setRole(adminTok: string, csrf: string, userId: number, role: string) {
  return request(app)
    .post(`/api/admin/users/${userId}/set-role`)
    .set("Authorization", `Bearer ${adminTok}`)
    .set("x-csrf-token", csrf)
    .send({ role })
    .expect(200);
}

beforeAll(async () => {
  vi.resetModules();
  const dbPath = join(tmpdir(), `security-hotfix-${process.pid}-${Date.now()}.db`);
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.JWT_SECRET = "security-hotfix-jwt-secret-32chars!";
  process.env.ENCRYPTION_KEY = "security-hotfix-encryption-key32!";
  process.env.JWT_EXPIRES_IN = "30m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.REFRESH_COOKIE_MAX_AGE = "604800";
  process.env.ADMIN_BOOTSTRAP_USERNAME = "sec_admin";
  process.env.VK_S3_ACCESS_KEY = "test";
  process.env.VK_S3_SECRET_KEY = "test";
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;

  runMigrations(dbPath);

  app = express();
  server = createServer(app);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const { registerRoutes } = await import("../../server/routes");
  registerRoutes(server, app);
  ({ storage } = await import("../../server/storage"));

  await register("sec_admin");
  storage.bootstrapAdminByUsername("sec_admin");
  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "sec_admin", password: "password123" })
    .expect(200);
  adminToken = adminLogin.body.accessToken;
  const adminCsrf = await getCsrf(adminToken);

  const doctorAuth = await register("sec_doctor");
  doctorUserId = doctorAuth.user.id;
  await setRole(adminToken, adminCsrf, doctorUserId, "doctor");
  const doctorLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "sec_doctor", password: "password123" })
    .expect(200);
  doctorToken = doctorLogin.body.accessToken;
  doctorCsrf = await getCsrf(doctorToken);
  await request(app)
    .put("/api/doctor/profile")
    .set("Authorization", `Bearer ${doctorToken}`)
    .set("x-csrf-token", doctorCsrf)
    .send({ fullName: "Dr Security" })
    .expect(200);

  const unassigned = await register("sec_doctor2");
  await setRole(adminToken, adminCsrf, unassigned.user.id, "doctor");
  const uLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "sec_doctor2", password: "password123" })
    .expect(200);
  unassignedDoctorToken = uLogin.body.accessToken;
  unassignedDoctorCsrf = await getCsrf(unassignedDoctorToken);
  await request(app)
    .put("/api/doctor/profile")
    .set("Authorization", `Bearer ${unassignedDoctorToken}`)
    .set("x-csrf-token", unassignedDoctorCsrf)
    .send({ fullName: "Dr Other" })
    .expect(200);

  const patient = await register("sec_patient");
  patientId = patient.user.id;
  patientToken = patient.accessToken;
  await request(app)
    .post(`/api/doctor/patients/${patientId}/assign`)
    .set("Authorization", `Bearer ${doctorToken}`)
    .set("x-csrf-token", doctorCsrf)
    .expect(200);

  const other = await register("sec_other");
  otherUserId = other.user.id;
  otherUserToken = other.accessToken;
});

afterAll(() => server.close());

describe("HF1: strip secrets from responses", () => {
  it("GET /api/doctor/patients does not leak passwordHash or mfaSecret", async () => {
    const res = await request(app)
      .get("/api/doctor/patients")
      .set("Authorization", `Bearer ${doctorToken}`)
      .expect(200);
    expect(res.body.patients.length).toBeGreaterThan(0);
    for (const p of res.body.patients) {
      expect(p.user.passwordHash).toBeUndefined();
      expect(p.user.mfaSecret).toBeUndefined();
      expect(p.user.username).toBeDefined();
    }
  });

  it("POST /api/admin/users/:id/set-role returns publicUser shape", async () => {
    const adminCsrf = await getCsrf(adminToken);
    const res = await setRole(adminToken, adminCsrf, otherUserId, "user");
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.mfaSecret).toBeUndefined();
    expect(res.body.user.username).toBe("sec_other");
    expect(res.body.user.role).toBe("user");
  });

  it("GET /api/user/export redacts passwordHash and mfaSecret", async () => {
    const res = await request(app).get("/api/user/export").set("Authorization", `Bearer ${patientToken}`).expect(200);
    const body = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
    expect(body.user).toBeDefined();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.mfaSecret).toBeUndefined();
    expect(body.user.username).toBe("sec_patient");
  });
});

describe("HF2: doctor assignment checks", () => {
  let mealId: number;

  beforeAll(async () => {
    const mealRes = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        date: "2026-08-08",
        tsStart: "12:00",
        mealType: "обед",
        foodText: "Суп",
        hungerBefore: 3,
        satietyAfter: 7,
      })
      .expect(200);
    mealId = mealRes.body.meal.id;
  });

  it("unassigned doctor cannot create plan for patient", async () => {
    await request(app)
      .post(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .set("x-csrf-token", unassignedDoctorCsrf)
      .send({ startDate: "2026-08-01", kcal: 1800 })
      .expect(403);
  });

  it("unassigned doctor cannot list patient plans", async () => {
    await request(app)
      .get(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .expect(403);
  });

  it("unassigned doctor cannot add meal notes", async () => {
    await request(app)
      .post(`/api/doctor/meals/${mealId}/notes`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .set("x-csrf-token", unassignedDoctorCsrf)
      .send({ note: "hack" })
      .expect(403);
  });

  it("unassigned doctor cannot notify patient", async () => {
    await request(app)
      .post(`/api/doctor/patients/${patientId}/notify`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .set("x-csrf-token", unassignedDoctorCsrf)
      .send({ title: "hack" })
      .expect(403);
  });

  it("assigned doctor can add meal note", async () => {
    await request(app)
      .post(`/api/doctor/meals/${mealId}/notes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .send({ note: "ok note" })
      .expect(200);
  });

  it("doctor cannot delete another doctor's plan", async () => {
    const create = await request(app)
      .post(`/api/doctor/patients/${patientId}/plans`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .send({ startDate: "2026-08-01", endDate: "2026-08-31", kcal: 2000 })
      .expect(200);
    const planId = create.body.plan.id as number;

    await request(app)
      .delete(`/api/doctor/plans/${planId}`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .set("x-csrf-token", unassignedDoctorCsrf)
      .expect(403);

    await request(app)
      .delete(`/api/doctor/plans/${planId}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .expect(200);
  });
});

describe("HF3: meal notes GET + photo mealId ownership", () => {
  let mealId: number;

  beforeAll(async () => {
    const mealRes = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        date: "2026-08-09",
        tsStart: "13:00",
        mealType: "обед",
        foodText: "Каша",
        hungerBefore: 2,
        satietyAfter: 6,
      })
      .expect(200);
    mealId = mealRes.body.meal.id;
    await request(app)
      .post(`/api/doctor/meals/${mealId}/notes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .send({ note: "private note" })
      .expect(200);
  });

  it("other user cannot read meal notes", async () => {
    await request(app).get(`/api/meals/${mealId}/notes`).set("Authorization", `Bearer ${otherUserToken}`).expect(403);
  });

  it("owner can read meal notes", async () => {
    const res = await request(app)
      .get(`/api/meals/${mealId}/notes`)
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    expect(res.body.notes.length).toBeGreaterThan(0);
  });

  it("assigned doctor can read meal notes", async () => {
    await request(app).get(`/api/meals/${mealId}/notes`).set("Authorization", `Bearer ${doctorToken}`).expect(200);
  });

  it("unassigned doctor cannot read meal notes", async () => {
    await request(app)
      .get(`/api/meals/${mealId}/notes`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .expect(403);
  });

  it("cannot upload photo bound to another user's meal", async () => {
    const csrf = await getCsrf(otherUserToken);
    await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${otherUserToken}`)
      .set("x-csrf-token", csrf)
      .field("mealId", String(mealId))
      .attach("photo", TINY_JPEG, "x.jpg")
      .expect(403);
  });

  it("owner can upload photo for own meal", async () => {
    const csrf = await getCsrf(patientToken);
    const res = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${patientToken}`)
      .set("x-csrf-token", csrf)
      .field("mealId", String(mealId))
      .attach("photo", TINY_JPEG, "ok.jpg")
      .expect(200);
    expect(res.body.photo.mealId).toBe(mealId);
  });

  it("unassigned doctor cannot list meal photos", async () => {
    await request(app)
      .get(`/api/meals/${mealId}/photos`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .expect(403);
  });

  it("unassigned doctor cannot GET photo of patient", async () => {
    const list = await request(app)
      .get(`/api/meals/${mealId}/photos`)
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    const photoId = list.body.photos[0]?.id as string;
    expect(photoId).toBeDefined();
    await request(app)
      .get(`/api/photos/${photoId}`)
      .set("Authorization", `Bearer ${unassignedDoctorToken}`)
      .expect(403);
  });

  it("assigned doctor can GET patient photo", async () => {
    const list = await request(app)
      .get(`/api/meals/${mealId}/photos`)
      .set("Authorization", `Bearer ${patientToken}`)
      .expect(200);
    const photoId = list.body.photos[0].id as string;
    await request(app).get(`/api/photos/${photoId}`).set("Authorization", `Bearer ${doctorToken}`).expect(200);
  });
});

describe("HF4: deleteUser cascade", () => {
  it("deletes photos (DB+S3), catalog, push, doctor links", async () => {
    deleteFromS3.mockClear();
    const temp = await register("sec_delete_me");
    const csrf = await getCsrf(temp.accessToken);

    const mealRes = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${temp.accessToken}`)
      .send({
        date: "2026-08-08",
        tsStart: "10:00",
        mealType: "завтрак",
        foodText: "Яйца",
        hungerBefore: 3,
        satietyAfter: 7,
      })
      .expect(200);

    await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${temp.accessToken}`)
      .set("x-csrf-token", csrf)
      .field("mealId", String(mealRes.body.meal.id))
      .attach("photo", TINY_JPEG, "del.jpg")
      .expect(200);

    await request(app)
      .post("/api/catalog")
      .set("Authorization", `Bearer ${temp.accessToken}`)
      .set("x-csrf-token", csrf)
      .send({ name: "Item", entries: [{ mealName: "Рис", kcal: 100 }] })
      .expect(200);

    storage.savePushSubscription({
      userId: temp.user.id,
      endpoint: "https://push.example/sec-delete",
      p256dh: "p",
      auth: "a",
    });

    await request(app)
      .post(`/api/doctor/patients/${temp.user.id}/assign`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .set("x-csrf-token", doctorCsrf)
      .expect(200);

    await request(app)
      .delete("/api/user/me")
      .set("Authorization", `Bearer ${temp.accessToken}`)
      .set("x-csrf-token", csrf)
      .expect(200);

    expect(deleteFromS3).toHaveBeenCalled();
    expect(storage.getUserById(temp.user.id)).toBeUndefined();
    expect(storage.getPhotosByUser(temp.user.id)).toEqual([]);
    expect(storage.getCatalogItems(temp.user.id)).toEqual([]);
    expect(storage.getUserPushSubscriptions(temp.user.id)).toEqual([]);

    const patients = storage.getDoctorPatients(storage.getDoctorByUserId(doctorUserId)!.id);
    expect(patients.some((p) => p.user.id === temp.user.id)).toBe(false);
  });
});

describe("HF5: prod error sanitizer", () => {
  it("hides non-ApiError 5xx messages in production via errorPayload", async () => {
    const { errorPayload } = await import("../../server/routes/helpers");
    const { ApiError } = await import("../../server/errors");

    expect(errorPayload(new Error("SECRET_DB_DETAIL xyz"), 500, "production")).toEqual({
      error: "Internal server error",
    });
    expect(errorPayload(ApiError.badRequest("visible validation"), 400, "production")).toMatchObject({
      error: "visible validation",
    });
    expect(errorPayload(new Error("dev detail"), 500, "test")).toEqual({ error: "dev detail" });
  });
});
