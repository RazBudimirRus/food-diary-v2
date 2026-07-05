import type { Express } from "express";
import { storage } from "../storage";
import { generateDayReport, generateRangeReport } from "../excel";
import { requireAuth, type AuthRequest } from "../auth";
import { ANALYTICS_MAX_DAYS } from "../config";
import { paramValue, isDateString, daysBetween } from "./helpers";

export function registerReportsRoutes(app: Express) {
  // ── Phase 21: Расширенные отчёты ────────────────────────────────────────────
  // IMPORTANT: /range must be registered BEFORE /:date to prevent Express
  // from matching "range" as a :date parameter (BUG-01).

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

  // ── Report ─────────────────────────────────────────────────────────────────
  // NOTE: /:date must be registered AFTER /range (see BUG-01)

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
