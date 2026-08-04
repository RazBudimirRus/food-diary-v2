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
import { sessionRepository } from "../../server/repositories/session";
import { catalogRepository } from "../../server/repositories/catalog";
import { photoRepository } from "../../server/repositories/photo";
import { auditRepository } from "../../server/repositories/audit";
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
// Phase 29.2: real SQL via db.ts — covered by auth/admin integration tests.

describe("SessionRepository", () => {
  it("exposes real session/token/API usage API", () => {
    expect(typeof sessionRepository.createRefreshToken).toBe("function");
    expect(typeof sessionRepository.getRefreshToken).toBe("function");
    expect(typeof sessionRepository.revokeRefreshToken).toBe("function");
    expect(typeof sessionRepository.listActiveRefreshSessions).toBe("function");
    expect(typeof sessionRepository.recordApiUsage).toBe("function");
    expect(typeof sessionRepository.getApiUsageSummary).toBe("function");
  });
});

// ─── CatalogRepository ───────────────────────────────────────────────────────

describe("CatalogRepository", () => {
  it("exposes real catalog API", () => {
    expect(typeof catalogRepository.getCatalogItems).toBe("function");
    expect(typeof catalogRepository.createCatalogItem).toBe("function");
    expect(typeof catalogRepository.deleteCatalogItem).toBe("function");
    expect(typeof catalogRepository.saveMealToCatalog).toBe("function");
  });
});

// ─── PhotoRepository ─────────────────────────────────────────────────────────

describe("PhotoRepository", () => {
  it("exposes real photo API", () => {
    expect(typeof photoRepository.savePhoto).toBe("function");
    expect(typeof photoRepository.getPhoto).toBe("function");
    expect(typeof photoRepository.getPhotosByMeal).toBe("function");
    expect(typeof photoRepository.deletePhoto).toBe("function");
    expect(typeof photoRepository.countUserPhotos).toBe("function");
  });
});

// ─── AuditRepository ─────────────────────────────────────────────────────────

describe("AuditRepository", () => {
  it("exposes real audit API", () => {
    expect(typeof auditRepository.addAuditLog).toBe("function");
    expect(typeof auditRepository.getAuditLog).toBe("function");
  });
});
