import { and, eq, sql } from "drizzle-orm";
import {
  doctorMealNotes,
  doctorPatients,
  doctorPlans,
  doctors,
  type Doctor,
  type DoctorMealNote,
  type DoctorPatient,
  type DoctorPlan,
  type InsertDoctorPlan,
  type User,
} from "@shared/schema";
import { db, sqlite } from "../db";

/**
 * DoctorRepository — real Drizzle/SQL access (Phase 29 finish / v2.27).
 * Do not import storage (avoids cycles).
 */
export class DoctorRepository {
  getDoctorByUserId(userId: number): Doctor | undefined {
    return db.select().from(doctors).where(eq(doctors.userId, userId)).get();
  }

  upsertDoctor(userId: number, data: { fullName: string; phone?: string; telegramUrl?: string }): Doctor {
    const existing = this.getDoctorByUserId(userId);
    if (existing) {
      return db
        .update(doctors)
        .set({
          fullName: data.fullName,
          phone: data.phone ?? null,
          telegramUrl: data.telegramUrl ?? null,
        })
        .where(eq(doctors.userId, userId))
        .returning()
        .get();
    }
    return db
      .insert(doctors)
      .values({
        userId,
        fullName: data.fullName,
        phone: data.phone ?? null,
        telegramUrl: data.telegramUrl ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  isDoctorAssignedToPatient(doctorId: number, patientId: number): boolean {
    const row = db
      .select({ id: doctorPatients.id })
      .from(doctorPatients)
      .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
      .get();
    return Boolean(row);
  }

  getDoctorPatients(doctorId: number): Array<{ user: User; assignedAt: string }> {
    // Never SELECT password_hash / mfa_secret — API must not leak credentials.
    const rows = sqlite
      .prepare(
        `
      SELECT u.id, u.username, u.email, u.display_name, u.role,
             u.pd_consent_at, u.created_at, u.last_login_at, u.mfa_enabled,
             dp.assigned_at
      FROM doctor_patients dp
      JOIN users u ON u.id = dp.patient_id
      WHERE dp.doctor_id = ?
      ORDER BY dp.assigned_at DESC
    `,
      )
      .all(doctorId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      user: {
        id: r.id as number,
        username: r.username as string,
        email: r.email as string,
        passwordHash: "",
        displayName: (r.display_name as string | null) ?? null,
        role: r.role as User["role"],
        pdConsentAt: (r.pd_consent_at as string | null) ?? null,
        createdAt: r.created_at as string,
        lastLoginAt: (r.last_login_at as string | null) ?? null,
        mfaEnabled: Boolean(r.mfa_enabled),
        mfaSecret: null,
      },
      assignedAt: r.assigned_at as string,
    }));
  }

  assignPatient(doctorId: number, patientId: number): DoctorPatient {
    return db
      .insert(doctorPatients)
      .values({
        doctorId,
        patientId,
        assignedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  removePatient(doctorId: number, patientId: number): void {
    db.delete(doctorPatients)
      .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
      .run();
  }

  getPatientDoctor(patientId: number): Doctor | undefined {
    const row = sqlite
      .prepare(
        `
      SELECT d.* FROM doctor_patients dp
      JOIN doctors d ON d.id = dp.doctor_id
      WHERE dp.patient_id = ?
      LIMIT 1
    `,
      )
      .get(patientId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as number,
      userId: row.user_id as number,
      fullName: row.full_name as string,
      phone: (row.phone as string | null) ?? null,
      telegramUrl: (row.telegram_url as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  }

  addDoctorMealNote(data: { doctorId: number; mealId: number; note?: string; suggestedKcal?: number }): DoctorMealNote {
    return db
      .insert(doctorMealNotes)
      .values({
        doctorId: data.doctorId,
        mealId: data.mealId,
        note: data.note ?? null,
        suggestedKcal: data.suggestedKcal ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getDoctorMealNotes(mealId: number): DoctorMealNote[] {
    return db.select().from(doctorMealNotes).where(eq(doctorMealNotes.mealId, mealId)).all();
  }

  createDoctorPlan(doctorId: number, data: InsertDoctorPlan): DoctorPlan {
    return db
      .insert(doctorPlans)
      .values({
        doctorId,
        patientId: data.patientId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        kcal: data.kcal ?? null,
        protein: data.protein ?? null,
        fat: data.fat ?? null,
        carbs: data.carbs ?? null,
        waterMl: data.waterMl ?? null,
        notes: data.notes ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getDoctorPlansForPatient(patientId: number): DoctorPlan[] {
    return db
      .select()
      .from(doctorPlans)
      .where(eq(doctorPlans.patientId, patientId))
      .all()
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  getDoctorPlan(planId: number): DoctorPlan | undefined {
    return db.select().from(doctorPlans).where(eq(doctorPlans.id, planId)).get();
  }

  deleteDoctorPlan(planId: number): void {
    db.delete(doctorPlans).where(eq(doctorPlans.id, planId)).run();
  }

  getActivePlan(patientId: number, date: string): DoctorPlan | undefined {
    // Prefer Drizzle for typed camelCase rows (raw sqlite returns snake_case).
    return db
      .select()
      .from(doctorPlans)
      .where(
        and(
          eq(doctorPlans.patientId, patientId),
          sql`${doctorPlans.startDate} <= ${date}`,
          sql`(${doctorPlans.endDate} IS NULL OR ${doctorPlans.endDate} >= ${date})`,
        ),
      )
      .orderBy(sql`${doctorPlans.startDate} DESC`)
      .limit(1)
      .get();
  }
}

export const doctorRepository = new DoctorRepository();
