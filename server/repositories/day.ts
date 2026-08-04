import { and, eq } from "drizzle-orm";
import { days, type Day, type DaySummary } from "@shared/schema";
import { db, sqlite } from "../db";

/**
 * DayRepository — real Drizzle/SQL access (Phase 29.2).
 */
export class DayRepository {
  getDayById(id: number): Day | undefined {
    return db.select().from(days).where(eq(days.id, id)).get();
  }

  getDayByDate(userId: number, date: string): Day | undefined {
    return db
      .select()
      .from(days)
      .where(and(eq(days.userId, userId), eq(days.date, date)))
      .get();
  }

  getDaysInRange(userId: number, startDate: string, endDate: string): Day[] {
    const rows = sqlite
      .prepare("SELECT * FROM days WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC")
      .all(userId, startDate, endDate) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as number,
      userId: row.user_id as number,
      date: row.date as string,
      wakeTime: (row.wake_time as string | null) ?? null,
      sleepTime: (row.sleep_time as string | null) ?? null,
      wakeDate: (row.wake_date as string | null) ?? null,
      sleepDate: (row.sleep_date as string | null) ?? null,
      sportActivity: (row.sport_activity as string | null) ?? null,
      steps: (row.steps as number | null) ?? null,
      dayComment: (row.day_comment as string | null) ?? null,
      summaryFilled: !!row.summary_filled,
    })) as Day[];
  }

  getOrCreateDay(userId: number, date: string): Day {
    const existing = this.getDayByDate(userId, date);
    if (existing) return existing;
    return db.insert(days).values({ userId, date, summaryFilled: false }).returning().get();
  }

  updateDaySummary(dayId: number, summary: DaySummary): Day {
    return db
      .update(days)
      .set({
        wakeTime: summary.wakeTime || null,
        sleepTime: summary.sleepTime || null,
        wakeDate: summary.wakeDate || null,
        sleepDate: summary.sleepDate || null,
        sportActivity: summary.sportActivity || null,
        steps: summary.steps ? Number(summary.steps) : null,
        dayComment: summary.dayComment || null,
        summaryFilled: true,
      })
      .where(eq(days.id, dayId))
      .returning()
      .get();
  }
}

export const dayRepository = new DayRepository();
