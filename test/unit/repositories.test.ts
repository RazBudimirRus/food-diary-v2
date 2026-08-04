/**
 * Repository unit tests (Phase 29 finish).
 * Real SQL repos expose APIs; behaviour is covered by route integration tests.
 * User/Doctor no longer mock-delegate through storage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../server/storage", () => {
  const storage: Record<string, ReturnType<typeof vi.fn>> = {};
  return { storage };
});

import { userRepository } from "../../server/repositories/user";
import { mealRepository } from "../../server/repositories/meal";
import { dayRepository } from "../../server/repositories/day";
import { doctorRepository } from "../../server/repositories/doctor";
import { sessionRepository } from "../../server/repositories/session";
import { catalogRepository } from "../../server/repositories/catalog";
import { photoRepository } from "../../server/repositories/photo";
import { auditRepository } from "../../server/repositories/audit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserRepository", () => {
  it("exposes real user/profile/MFA/secrets/push API", () => {
    expect(typeof userRepository.getUserById).toBe("function");
    expect(typeof userRepository.createUser).toBe("function");
    expect(typeof userRepository.setUserRole).toBe("function");
    expect(typeof userRepository.setMfaSecret).toBe("function");
    expect(typeof userRepository.getSecret).toBe("function");
    expect(typeof userRepository.savePushSubscription).toBe("function");
  });
});

describe("MealRepository", () => {
  it("exposes real meal CRUD API", () => {
    expect(typeof mealRepository.getMealsByDay).toBe("function");
    expect(typeof mealRepository.addMeal).toBe("function");
    expect(typeof mealRepository.deleteMeal).toBe("function");
    expect(typeof mealRepository.restoreMeal).toBe("function");
  });
});

describe("DayRepository", () => {
  it("exposes real day API", () => {
    expect(typeof dayRepository.getDayById).toBe("function");
    expect(typeof dayRepository.getOrCreateDay).toBe("function");
  });
});

describe("DoctorRepository", () => {
  it("exposes real doctor/patients/plans API", () => {
    expect(typeof doctorRepository.getDoctorByUserId).toBe("function");
    expect(typeof doctorRepository.assignPatient).toBe("function");
    expect(typeof doctorRepository.createDoctorPlan).toBe("function");
    expect(typeof doctorRepository.getActivePlan).toBe("function");
  });
});

describe("SessionRepository", () => {
  it("exposes real session/token/API usage API", () => {
    expect(typeof sessionRepository.createRefreshToken).toBe("function");
    expect(typeof sessionRepository.listActiveRefreshSessions).toBe("function");
    expect(typeof sessionRepository.recordApiUsage).toBe("function");
  });
});

describe("CatalogRepository", () => {
  it("exposes real catalog API", () => {
    expect(typeof catalogRepository.getCatalogItems).toBe("function");
    expect(typeof catalogRepository.createCatalogItem).toBe("function");
  });
});

describe("PhotoRepository", () => {
  it("exposes real photo API", () => {
    expect(typeof photoRepository.savePhoto).toBe("function");
    expect(typeof photoRepository.getPhoto).toBe("function");
  });
});

describe("AuditRepository", () => {
  it("exposes real audit API", () => {
    expect(typeof auditRepository.addAuditLog).toBe("function");
    expect(typeof auditRepository.getAuditLog).toBe("function");
  });
});
