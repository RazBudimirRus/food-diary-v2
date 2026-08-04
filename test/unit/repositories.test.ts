/**
 * Phase 35.1 — Unit tests for all repositories
 *
 * Repositories are thin delegation wrappers over storage.ts.
 * We mock storage to verify that each method delegates correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock storage before importing repositories
vi.mock("../../server/storage", () => {
  const storage: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    // User
    "getUserById",
    "getUserByUsername",
    "getUserByEmail",
    "searchUsers",
    "createUser",
    "updateUserPassword",
    "updateUserProfile",
    "setLastLogin",
    "deleteUser",
    "getUserAllData",
    "getUserProfile",
    "upsertUserProfile",
    "listUsers",
    "setUserRole",
    "bootstrapAdminByUsername",
    "upsertDietaryRestrictions",
    "savePushSubscription",
    "getUserPushSubscriptions",
    "deletePushSubscription",
    // Meal
    "getMealsByDay",
    "addMeal",
    "updateMeal",
    "deleteMeal",
    "getMeal",
    // Day
    "getDayById",
    "getDayByDate",
    "getDaysInRange",
    "getOrCreateDay",
    "updateDaySummary",
    // Doctor
    "getDoctorByUserId",
    "upsertDoctor",
    "getDoctorPatients",
    "assignPatient",
    "removePatient",
    "getPatientDoctor",
    "addDoctorMealNote",
    "getDoctorMealNotes",
    "createDoctorPlan",
    "getDoctorPlansForPatient",
    "deleteDoctorPlan",
    "getActivePlan",
    // Session
    "createRefreshToken",
    "getRefreshToken",
    "revokeRefreshToken",
    "revokeRefreshSessionById",
    "revokeUserRefreshTokens",
    "deleteExpiredOrRevokedRefreshTokens",
    "listActiveRefreshSessions",
    "createPasswordResetToken",
    "getPasswordResetToken",
    "markPasswordResetTokenUsed",
    "deleteExpiredPasswordResetTokens",
    "recordApiUsage",
    "getApiUsageSummary",
    // Catalog
    "getCatalogItems",
    "createCatalogItem",
    "deleteCatalogItem",
    "saveMealToCatalog",
    // Photo
    "savePhoto",
    "getPhoto",
    "getPhotosByMeal",
    "getPhotosByUser",
    "deletePhoto",
    "countUserPhotos",
    // Audit
    "addAuditLog",
    "getAuditLog",
  ];
  for (const m of methods) storage[m] = vi.fn().mockReturnValue(`${m}-result`);
  return { storage };
});

import { UserRepository } from "../../server/repositories/user";
import { mealRepository } from "../../server/repositories/meal";
import { dayRepository } from "../../server/repositories/day";
import { DoctorRepository } from "../../server/repositories/doctor";
import { SessionRepository } from "../../server/repositories/session";
import { CatalogRepository } from "../../server/repositories/catalog";
import { PhotoRepository } from "../../server/repositories/photo";
import { AuditRepository } from "../../server/repositories/audit";
import { storage } from "../../server/storage";

const s = storage as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── UserRepository ──────────────────────────────────────────────────────────

describe("UserRepository", () => {
  const repo = new UserRepository();

  it("getUserById delegates correctly", () => {
    repo.getUserById(1);
    expect(s.getUserById).toHaveBeenCalledWith(1);
  });
  it("getUserByUsername delegates", () => {
    repo.getUserByUsername("alice");
    expect(s.getUserByUsername).toHaveBeenCalledWith("alice");
  });
  it("getUserByEmail delegates", () => {
    repo.getUserByEmail("a@b.com");
    expect(s.getUserByEmail).toHaveBeenCalledWith("a@b.com");
  });
  it("searchUsers delegates with limit", () => {
    repo.searchUsers("ali", 5);
    expect(s.searchUsers).toHaveBeenCalledWith("ali", 5);
  });
  it("createUser delegates", () => {
    const data = { username: "u", email: "u@u.com", passwordHash: "h", pdConsentAt: new Date().toISOString() };
    repo.createUser(data as Parameters<typeof repo.createUser>[0]);
    expect(s.createUser).toHaveBeenCalledWith(data);
  });
  it("updateUserPassword delegates", () => {
    repo.updateUserPassword(2, "newhash");
    expect(s.updateUserPassword).toHaveBeenCalledWith(2, "newhash");
  });
  it("setLastLogin delegates", () => {
    repo.setLastLogin(3);
    expect(s.setLastLogin).toHaveBeenCalledWith(3);
  });
  it("deleteUser delegates", () => {
    repo.deleteUser(4);
    expect(s.deleteUser).toHaveBeenCalledWith(4);
  });
  it("listUsers delegates", () => {
    repo.listUsers();
    expect(s.listUsers).toHaveBeenCalled();
  });
  it("setUserRole delegates", () => {
    repo.setUserRole(5, "admin");
    expect(s.setUserRole).toHaveBeenCalledWith(5, "admin");
  });
  it("savePushSubscription delegates", () => {
    const sub = { userId: 1, endpoint: "e", p256dh: "k", auth: "a" };
    repo.savePushSubscription(sub as Parameters<typeof repo.savePushSubscription>[0]);
    expect(s.savePushSubscription).toHaveBeenCalledWith(sub);
  });
  it("getUserPushSubscriptions delegates", () => {
    repo.getUserPushSubscriptions(6);
    expect(s.getUserPushSubscriptions).toHaveBeenCalledWith(6);
  });
  it("deletePushSubscription delegates", () => {
    repo.deletePushSubscription("endpoint-url");
    expect(s.deletePushSubscription).toHaveBeenCalledWith("endpoint-url");
  });
});

// ─── MealRepository ──────────────────────────────────────────────────────────
// Phase 29.2: MealRepository uses shared db (not storage pass-through).
// Behaviour covered by meals-routes + soft-delete analytics integration tests.

describe("MealRepository", () => {
  it("exposes real meal CRUD API (not storage wrappers)", () => {
    expect(typeof mealRepository.getMealsByDay).toBe("function");
    expect(typeof mealRepository.addMeal).toBe("function");
    expect(typeof mealRepository.updateMeal).toBe("function");
    expect(typeof mealRepository.deleteMeal).toBe("function");
    expect(typeof mealRepository.restoreMeal).toBe("function");
    expect(typeof mealRepository.getMeal).toBe("function");
  });
});

// ─── DayRepository ───────────────────────────────────────────────────────────
// Phase 29.2: real SQL via db.ts — covered by meals/days integration routes.

describe("DayRepository", () => {
  it("exposes real day API (not storage wrappers)", () => {
    expect(typeof dayRepository.getDayById).toBe("function");
    expect(typeof dayRepository.getDayByDate).toBe("function");
    expect(typeof dayRepository.getOrCreateDay).toBe("function");
    expect(typeof dayRepository.updateDaySummary).toBe("function");
  });
});

// ─── DoctorRepository ────────────────────────────────────────────────────────

describe("DoctorRepository", () => {
  const repo = new DoctorRepository();

  it("getDoctorByUserId delegates", () => {
    repo.getDoctorByUserId(1);
    expect(s.getDoctorByUserId).toHaveBeenCalledWith(1);
  });
  it("upsertDoctor delegates", () => {
    const data = { fullName: "Dr. Test" };
    repo.upsertDoctor(1, data as Parameters<typeof repo.upsertDoctor>[1]);
    expect(s.upsertDoctor).toHaveBeenCalledWith(1, data);
  });
  it("getDoctorPatients delegates", () => {
    repo.getDoctorPatients(2);
    expect(s.getDoctorPatients).toHaveBeenCalledWith(2);
  });
  it("assignPatient delegates", () => {
    repo.assignPatient(1, 5);
    expect(s.assignPatient).toHaveBeenCalledWith(1, 5);
  });
  it("removePatient delegates", () => {
    repo.removePatient(1, 5);
    expect(s.removePatient).toHaveBeenCalledWith(1, 5);
  });
  it("getPatientDoctor delegates", () => {
    repo.getPatientDoctor(5);
    expect(s.getPatientDoctor).toHaveBeenCalledWith(5);
  });
  it("createDoctorPlan delegates", () => {
    const plan = { title: "План", startDate: "2026-07-01", endDate: "2026-07-31", notes: "" };
    repo.createDoctorPlan(1, plan as Parameters<typeof repo.createDoctorPlan>[1]);
    expect(s.createDoctorPlan).toHaveBeenCalledWith(1, plan);
  });
  it("getDoctorPlansForPatient delegates", () => {
    repo.getDoctorPlansForPatient(3);
    expect(s.getDoctorPlansForPatient).toHaveBeenCalledWith(3);
  });
  it("deleteDoctorPlan delegates", () => {
    repo.deleteDoctorPlan(7);
    expect(s.deleteDoctorPlan).toHaveBeenCalledWith(7);
  });
});

// ─── SessionRepository ───────────────────────────────────────────────────────

describe("SessionRepository", () => {
  const repo = new SessionRepository();

  it("createRefreshToken delegates", () => {
    const data = { userId: 1, tokenHash: "hash", expiresAt: "2026-08-01" };
    repo.createRefreshToken(data as Parameters<typeof repo.createRefreshToken>[0]);
    expect(s.createRefreshToken).toHaveBeenCalledWith(data);
  });
  it("getRefreshToken delegates", () => {
    repo.getRefreshToken("hash123");
    expect(s.getRefreshToken).toHaveBeenCalledWith("hash123");
  });
  it("revokeRefreshToken delegates", () => {
    repo.revokeRefreshToken("tok");
    expect(s.revokeRefreshToken).toHaveBeenCalledWith("tok");
  });
  it("revokeUserRefreshTokens delegates", () => {
    repo.revokeUserRefreshTokens(1);
    expect(s.revokeUserRefreshTokens).toHaveBeenCalledWith(1);
  });
  it("createPasswordResetToken delegates", () => {
    const data = { userId: 1, tokenHash: "h", expiresAt: "2026-08-01" };
    repo.createPasswordResetToken(data as Parameters<typeof repo.createPasswordResetToken>[0]);
    expect(s.createPasswordResetToken).toHaveBeenCalledWith(data);
  });
  it("getPasswordResetToken delegates", () => {
    repo.getPasswordResetToken("h");
    expect(s.getPasswordResetToken).toHaveBeenCalledWith("h");
  });
  it("markPasswordResetTokenUsed delegates", () => {
    repo.markPasswordResetTokenUsed(99);
    expect(s.markPasswordResetTokenUsed).toHaveBeenCalledWith(99);
  });
  it("recordApiUsage delegates", () => {
    const data = { service: "deepseek", tokensUsed: 100, date: "2026-07-04" };
    repo.recordApiUsage(data as Parameters<typeof repo.recordApiUsage>[0]);
    expect(s.recordApiUsage).toHaveBeenCalledWith(data);
  });
  it("getApiUsageSummary delegates", () => {
    repo.getApiUsageSummary("2026-07-01", "2026-07-31");
    expect(s.getApiUsageSummary).toHaveBeenCalledWith("2026-07-01", "2026-07-31");
  });
});

// ─── CatalogRepository ───────────────────────────────────────────────────────

describe("CatalogRepository", () => {
  const repo = new CatalogRepository();

  it("getCatalogItems delegates", () => {
    repo.getCatalogItems(1);
    expect(s.getCatalogItems).toHaveBeenCalledWith(1);
  });
  it("createCatalogItem delegates", () => {
    const data = { name: "Гречка", kcal: 330, protein: 12, fat: 3, carbs: 65 };
    repo.createCatalogItem(1, data as Parameters<typeof repo.createCatalogItem>[1]);
    expect(s.createCatalogItem).toHaveBeenCalledWith(1, data);
  });
  it("deleteCatalogItem delegates", () => {
    repo.deleteCatalogItem(1, 5);
    expect(s.deleteCatalogItem).toHaveBeenCalledWith(1, 5);
  });
  it("saveMealToCatalog delegates", () => {
    repo.saveMealToCatalog(1, 10, "Моя гречка");
    expect(s.saveMealToCatalog).toHaveBeenCalledWith(1, 10, "Моя гречка");
  });
});

// ─── PhotoRepository ─────────────────────────────────────────────────────────

describe("PhotoRepository", () => {
  const repo = new PhotoRepository();

  it("savePhoto delegates", () => {
    const data = {
      photoId: "uuid",
      userId: 1,
      mealId: 2,
      s3Key: "key",
      originalName: "img.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    };
    repo.savePhoto(data as Parameters<typeof repo.savePhoto>[0]);
    expect(s.savePhoto).toHaveBeenCalledWith(data);
  });
  it("getPhoto delegates", () => {
    repo.getPhoto("uuid");
    expect(s.getPhoto).toHaveBeenCalledWith("uuid");
  });
  it("getPhotosByMeal delegates", () => {
    repo.getPhotosByMeal(3);
    expect(s.getPhotosByMeal).toHaveBeenCalledWith(3);
  });
  it("getPhotosByUser delegates", () => {
    repo.getPhotosByUser(4);
    expect(s.getPhotosByUser).toHaveBeenCalledWith(4);
  });
  it("deletePhoto delegates", () => {
    repo.deletePhoto("uuid");
    expect(s.deletePhoto).toHaveBeenCalledWith("uuid");
  });
  it("countUserPhotos delegates", () => {
    repo.countUserPhotos(5);
    expect(s.countUserPhotos).toHaveBeenCalledWith(5);
  });
});

// ─── AuditRepository ─────────────────────────────────────────────────────────

describe("AuditRepository", () => {
  const repo = new AuditRepository();

  it("addAuditLog delegates", () => {
    const data = { userId: 1, action: "test", ip: "127.0.0.1", userAgent: "test", targetId: null, extra: null };
    repo.addAuditLog(data as Parameters<typeof repo.addAuditLog>[0]);
    expect(s.addAuditLog).toHaveBeenCalledWith(data);
  });
  it("getAuditLog delegates", () => {
    const filters = { userId: 1, limit: 50, offset: 0 };
    repo.getAuditLog(filters as Parameters<typeof repo.getAuditLog>[0]);
    expect(s.getAuditLog).toHaveBeenCalledWith(filters);
  });
});
