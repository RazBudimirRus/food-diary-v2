import type { Express, NextFunction } from "express";
import webpush from "web-push";
import { storage, getMskDate } from "../storage";
import { insertDoctorPlanSchema } from "@shared/schema";
import { requireAuth, type AuthRequest } from "../auth";
import { auditLog } from "../audit";
import { requireDoctor } from "./middleware";
import { AUDIT_LOG_PAGE_SIZE } from "../config";
import { paramValue } from "./helpers";
import { ApiError } from "../errors";

// ── VAPID init (Web Push) ────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@fooddiary.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export function registerDoctorRoutes(app: Express) {
  /** GET /api/doctor/profile */
  app.get("/api/doctor/profile", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const doctor = storage.getDoctorByUserId(req.user!.id);
      res.json({ doctor: doctor ?? null });
    } catch (e) {
      next(e);
    }
  });

  /** PUT /api/doctor/profile */
  app.put("/api/doctor/profile", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { fullName, phone, telegramUrl } = req.body;
      if (!fullName) throw ApiError.badRequest("fullName обязателен");
      const doctor = storage.upsertDoctor(req.user!.id, { fullName, phone, telegramUrl });
      res.json({ doctor });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/doctor/patients */
  app.get("/api/doctor/patients", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.json({ patients: [] });
      const patients = storage.getDoctorPatients(doctor.id);
      res.json({ patients });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/doctor/search-users?q=... */
  app.get("/api/doctor/search-users", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const q = ((req.query.q as string) || "").trim();
      if (q.length < 2) return res.json({ users: [] });
      const results = storage.searchUsers(q, 10);
      // Return only safe fields
      const safe = results.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName }));
      res.json({ users: safe });
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/doctor/patients/:id/assign */
  app.post(
    "/api/doctor/patients/:id/assign",
    requireAuth,
    requireDoctor,
    (req: AuthRequest, res, next: NextFunction) => {
      try {
        const patientId = parseInt(paramValue(req.params.id), 10);
        const doctor = storage.getDoctorByUserId(req.user!.id);
        if (!doctor) {
          throw ApiError.badRequest("Сначала заполните профиль врача — перейдите на вкладку Профиль");
        }
        if (patientId === req.user!.id) throw ApiError.badRequest("Нельзя добавить себя в качестве пациента");
        const patient = storage.getUserById(patientId);
        if (!patient) throw ApiError.notFound("Пользователь не найден в системе");
        // admin может быть пациентом: врач читает только дневник, не управляет аккаунтом
        try {
          const dp = storage.assignPatient(doctor.id, patientId);
          void auditLog(req, "doctor.assign_patient", patientId);
          res.json({ doctorPatient: dp });
        } catch {
          throw ApiError.conflict("Этот пациент уже привязан к вам");
        }
      } catch (e) {
        next(e);
      }
    },
  );

  /** DELETE /api/doctor/patients/:id */
  app.delete("/api/doctor/patients/:id", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const patientId = parseInt(paramValue(req.params.id), 10);
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) throw ApiError.notFound("Врач не найден");
      storage.removePatient(doctor.id, patientId);
      void auditLog(req, "doctor.remove_patient", patientId);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/doctor/patients/:id/diary?date=YYYY-MM-DD */
  app.get("/api/doctor/patients/:id/diary", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const patientId = parseInt(paramValue(req.params.id), 10);
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) throw ApiError.forbidden("Врач не найден");

      // Verify patient is assigned
      const patients = storage.getDoctorPatients(doctor.id);
      const assigned = patients.some((p) => p.user.id === patientId);
      if (!assigned) throw ApiError.forbidden("Пациент не привязан к вам");

      const date = (req.query.date as string) || getMskDate();
      const day = storage.getDayByDate(patientId, date);
      void auditLog(req, "doctor.view_diary", patientId, { date });
      if (!day) return res.json({ day: null, meals: [] });
      const meals = storage.getMealsByDay(day.id);
      res.json({ day, meals });
    } catch (e) {
      next(e);
    }
  });

  /** POST /api/doctor/patients/:id/notify (Web Push) */
  app.post(
    "/api/doctor/patients/:id/notify",
    requireAuth,
    requireDoctor,
    async (req: AuthRequest, res, next: NextFunction) => {
      try {
        if (!process.env.VAPID_PUBLIC_KEY) {
          throw new ApiError(503, "Web Push не настроен", "service_unavailable");
        }
        const patientId = parseInt(paramValue(req.params.id), 10);
        const { title, body } = req.body;
        if (!title) throw ApiError.badRequest("title обязателен");

        const subs = storage.getUserPushSubscriptions(patientId);
        if (!subs.length) return res.json({ sent: 0 });

        let sent = 0;
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title, body: body || "" }),
            );
            sent++;
          } catch {
            storage.deletePushSubscription(sub.endpoint);
          }
        }
        res.json({ sent });
      } catch (e) {
        next(e);
      }
    },
  );

  /** POST /api/doctor/meals/:mealId/notes */
  app.post(
    "/api/doctor/meals/:mealId/notes",
    requireAuth,
    requireDoctor,
    (req: AuthRequest, res, next: NextFunction) => {
      try {
        const mealId = parseInt(paramValue(req.params.mealId), 10);
        const doctor = storage.getDoctorByUserId(req.user!.id);
        if (!doctor) throw ApiError.badRequest("Профиль врача не найден");
        const { note, suggestedKcal } = req.body;
        const result = storage.addDoctorMealNote({ doctorId: doctor.id, mealId, note, suggestedKcal });
        void auditLog(req, "doctor.add_meal_note", mealId, { note, suggestedKcal });
        res.json({ note: result });
      } catch (e) {
        next(e);
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // Phase 18 — Doctor КБЖУ Plans
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/doctor/patients/:id/plans */
  app.post(
    "/api/doctor/patients/:id/plans",
    requireAuth,
    requireDoctor,
    (req: AuthRequest, res, next: NextFunction) => {
      try {
        const patientId = parseInt(paramValue(req.params.id), 10);
        const doctor = storage.getDoctorByUserId(req.user!.id);
        if (!doctor) throw ApiError.badRequest("Профиль врача не найден");
        const parsed = insertDoctorPlanSchema.safeParse({ ...req.body, patientId });
        if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten());
        const plan = storage.createDoctorPlan(doctor.id, parsed.data);
        void auditLog(req, "doctor.create_plan", patientId, { planId: plan.id });
        res.json({ plan });
      } catch (e) {
        next(e);
      }
    },
  );

  /** GET /api/doctor/patients/:id/plans */
  app.get("/api/doctor/patients/:id/plans", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const patientId = parseInt(paramValue(req.params.id), 10);
      const plans = storage.getDoctorPlansForPatient(patientId);
      res.json({ plans });
    } catch (e) {
      next(e);
    }
  });

  /** DELETE /api/doctor/plans/:id */
  app.delete("/api/doctor/plans/:id", requireAuth, requireDoctor, (req: AuthRequest, res, next: NextFunction) => {
    try {
      const planId = parseInt(paramValue(req.params.id), 10);
      storage.deleteDoctorPlan(planId);
      void auditLog(req, "doctor.delete_plan", planId);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** GET /api/doctor/audit-log — Phase 24 (только свои действия, последние 50) */
  app.get("/api/doctor/audit-log", requireAuth, requireDoctor, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const entries = await storage.getAuditLog({ actorId: req.user!.id, limit: AUDIT_LOG_PAGE_SIZE });
      res.json({ entries });
    } catch (e) {
      next(e);
    }
  });
}
