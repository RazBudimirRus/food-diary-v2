import type { Express } from "express";
import { storage } from "../storage";
import { generateDayReport, generateRangeReport } from "../excel";
import { generateAnalyticsPdf } from "../analytics-pdf";
import { generateDoctorDayPdf, generateDoctorRangePdf } from "../doctor-pdf";
import { buildDoctorPdfOptions } from "./doctor-pdf-options";
import { requireAuth, type AuthRequest } from "../auth";
import { ANALYTICS_MAX_DAYS } from "../config";
import { paramValue, isDateString, daysBetween } from "./helpers";
import { getCalendarWeekRange, getCalendarMonthRange, mskToday } from "../../shared/dates";

export function registerReportsRoutes(app: Express) {
  // ── Phase 21: Расширенные отчёты ────────────────────────────────────────────
  // IMPORTANT: /range and /week and /month must be registered BEFORE /:date
  // to prevent Express matching them as :date params (BUG-01).

  /**
   * GET /api/report/week?date=YYYY-MM-DD
   * Excel report for the ISO calendar week containing `date`.
   * If `date` is omitted, uses today (MSK).
   */
  app.get("/api/report/week", requireAuth, async (req: AuthRequest, res) => {
    try {
      const anchor = paramValue(req.query.date as string) || mskToday();
      if (!isDateString(anchor)) {
        return res.status(400).json({ error: "Некорректная дата. Формат: YYYY-MM-DD" });
      }
      const { from, to } = getCalendarWeekRange(anchor);
      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанную неделю записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateRangeReport(days, mealsByDayId);
      const filename = `Дневник_питания_неделя_${from}_${to}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/report/month?date=YYYY-MM-DD
   * Excel report for the calendar month containing `date`.
   * If `date` is omitted, uses today (MSK).
   */
  app.get("/api/report/month", requireAuth, async (req: AuthRequest, res) => {
    try {
      const anchor = paramValue(req.query.date as string) || mskToday();
      if (!isDateString(anchor)) {
        return res.status(400).json({ error: "Некорректная дата. Формат: YYYY-MM-DD" });
      }
      const { from, to } = getCalendarMonthRange(anchor);
      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный месяц записей нет" });

      if (daysBetween(from, to) > ANALYTICS_MAX_DAYS) {
        return res.status(400).json({ error: `Максимальный период — ${ANALYTICS_MAX_DAYS} дней` });
      }

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateRangeReport(days, mealsByDayId);
      const filename = `Дневник_питания_${anchor.slice(0, 7)}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/report/range?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Multi-day Excel report (Phase 21)
   */
  app.get("/api/report/range", requireAuth, async (req: AuthRequest, res) => {
    try {
      const from = paramValue(req.query.from as string);
      const to = paramValue(req.query.to as string);
      if (!isDateString(from) || !isDateString(to)) {
        return res.status(400).json({ error: "Некорректные даты. Формат: YYYY-MM-DD" });
      }
      if (from > to) return res.status(400).json({ error: "Дата начала позже даты окончания" });
      const maxDays = ANALYTICS_MAX_DAYS;
      if (daysBetween(from, to) > maxDays) {
        return res.status(400).json({ error: `Максимальный период для отчёта — ${maxDays} дней` });
      }

      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный период записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateRangeReport(days, mealsByDayId);
      const filename = `Дневник_питания_${from}_${to}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── UX-22: Analytics PDF export ─────────────────────────────────────────────

  /**
   * GET /api/report/analytics-pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
   * PDF analytics report for the given date range.
   */
  app.get("/api/report/analytics-pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const from = paramValue(req.query.from as string);
      const to = paramValue(req.query.to as string);
      if (!isDateString(from) || !isDateString(to)) {
        return res.status(400).json({ error: "Некорректные даты. Формат: YYYY-MM-DD" });
      }
      if (from > to) return res.status(400).json({ error: "Дата начала позже даты окончания" });
      if (daysBetween(from, to) > ANALYTICS_MAX_DAYS) {
        return res.status(400).json({ error: `Максимальный период — ${ANALYTICS_MAX_DAYS} дней` });
      }

      const userId = req.user!.id;
      const days = storage.getDaysInRange(userId, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный период записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateAnalyticsPdf(days, mealsByDayId, from, to);
      const filename = `Аналитика_питания_${from}_${to}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  // ── v2.29.0: Doctor-friendly PDF export (NEW-PDF-1) ────────────────────────
  // Compact print-ready single/multi-page PDF alternative to Excel reports.
  // All PDF routes must be registered BEFORE /:date to avoid it swallowing them.

  /**
   * GET /api/report/week/pdf?date=YYYY-MM-DD
   * Doctor PDF report for the ISO calendar week containing `date`.
   */
  app.get("/api/report/week/pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const anchor = paramValue(req.query.date as string) || mskToday();
      if (!isDateString(anchor)) {
        return res.status(400).json({ error: "Некорректная дата. Формат: YYYY-MM-DD" });
      }
      const { from, to } = getCalendarWeekRange(anchor);
      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанную неделю записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateDoctorRangePdf(days, mealsByDayId, from, to, buildDoctorPdfOptions(req.user!.id));
      const filename = `Дневник_питания_неделя_${from}_${to}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/report/month/pdf?date=YYYY-MM-DD
   * Doctor PDF report for the calendar month containing `date`.
   */
  app.get("/api/report/month/pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const anchor = paramValue(req.query.date as string) || mskToday();
      if (!isDateString(anchor)) {
        return res.status(400).json({ error: "Некорректная дата. Формат: YYYY-MM-DD" });
      }
      const { from, to } = getCalendarMonthRange(anchor);
      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный месяц записей нет" });

      if (daysBetween(from, to) > ANALYTICS_MAX_DAYS) {
        return res.status(400).json({ error: `Максимальный период — ${ANALYTICS_MAX_DAYS} дней` });
      }

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateDoctorRangePdf(days, mealsByDayId, from, to, buildDoctorPdfOptions(req.user!.id));
      const filename = `Дневник_питания_${anchor.slice(0, 7)}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/report/range/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Doctor PDF report for the custom range.
   */
  app.get("/api/report/range/pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const from = paramValue(req.query.from as string);
      const to = paramValue(req.query.to as string);
      if (!isDateString(from) || !isDateString(to)) {
        return res.status(400).json({ error: "Некорректные даты. Формат: YYYY-MM-DD" });
      }
      if (from > to) return res.status(400).json({ error: "Дата начала позже даты окончания" });
      const maxDays = ANALYTICS_MAX_DAYS;
      if (daysBetween(from, to) > maxDays) {
        return res.status(400).json({ error: `Максимальный период для отчёта — ${maxDays} дней` });
      }

      const days = storage.getDaysInRange(req.user!.id, from, to);
      if (!days.length) return res.status(404).json({ error: "За указанный период записей нет" });

      const mealsByDayId = new Map<number, import("@shared/schema").Meal[]>();
      for (const day of days) {
        mealsByDayId.set(day.id, storage.getMealsByDay(day.id));
      }

      const buf = await generateDoctorRangePdf(days, mealsByDayId, from, to, buildDoctorPdfOptions(req.user!.id));
      const filename = `Дневник_питания_${from}_${to}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/report/:date/pdf
   * Doctor PDF report for a single day.
   */
  app.get("/api/report/:date/pdf", requireAuth, async (req: AuthRequest, res) => {
    try {
      const date = paramValue(req.params.date);
      if (!isDateString(date)) {
        return res.status(400).json({ error: "Некорректная дата. Формат: YYYY-MM-DD" });
      }
      const day = storage.getDayByDate(req.user!.id, date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      if (!day.summaryFilled && req.query.force !== "1") {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const mealsData = storage.getMealsByDay(day.id);
      const buf = await generateDoctorDayPdf(day, mealsData, buildDoctorPdfOptions(req.user!.id));
      const filename = `Дневник_питания_${date}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // NOTE: /:date must be registered AFTER all named routes (see BUG-01)

  app.get("/api/report/:date", requireAuth, async (req: AuthRequest, res) => {
    try {
      const date = paramValue(req.params.date);
      const day = storage.getDayByDate(req.user!.id, date);
      if (!day) return res.status(404).json({ error: "День не найден" });

      if (!day.summaryFilled && req.query.force !== "1") {
        return res.status(202).json({ needsSummary: true, dayId: day.id });
      }

      const mealsData = storage.getMealsByDay(day.id);
      const buf = await generateDayReport(day, mealsData);
      const filename = `Дневник_питания_${date}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
