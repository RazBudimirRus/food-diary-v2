/** MSK calendar date helpers (YYYY-MM-DD, UTC+3 offset). */

export function mskToday(utcMs?: number): string {
  const d = new Date((utcMs ?? Date.now()) + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function countInclusiveDays(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const to = new Date(`${toDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

export function iterateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export type CalendarPeriodType = "week" | "month" | "year";

export function getCalendarWeekRange(anchor: string): { from: string; to: string } {
  const d = new Date(`${anchor}T00:00:00Z`);
  const dow = d.getUTCDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

export function getCalendarMonthRange(anchor: string): { from: string; to: string } {
  const [y, m] = anchor.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function getCalendarYearRange(anchor: string): { from: string; to: string } {
  const y = anchor.slice(0, 4);
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function getCalendarPeriodRange(
  period: CalendarPeriodType,
  anchor: string,
): { from: string; to: string } {
  if (period === "week") return getCalendarWeekRange(anchor);
  if (period === "month") return getCalendarMonthRange(anchor);
  return getCalendarYearRange(anchor);
}

export function shiftCalendarAnchor(
  anchor: string,
  period: CalendarPeriodType,
  delta: -1 | 1,
): string {
  const [y, m] = anchor.split("-").map(Number);
  if (period === "week") return addDays(anchor, delta * 7);
  if (period === "month") {
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${y + delta}-01-01`;
}

/** Sleep 18:00–23:59 → diary day; 00:00–17:59 → next calendar day. */
export function inferSleepDate(diaryDate: string, sleepTime: string | null | undefined): string | null {
  if (!sleepTime) return null;
  const [hours] = sleepTime.split(":").map(Number);
  if (!Number.isFinite(hours)) return null;
  if (hours >= 18) return diaryDate;
  return addDays(diaryDate, 1);
}

export function resolveWakeDate(
  diaryDate: string,
  wakeDate: string | null | undefined,
): string | null {
  return wakeDate ?? diaryDate;
}

export function resolveSleepDate(
  diaryDate: string,
  sleepTime: string | null | undefined,
  sleepDate: string | null | undefined,
): string | null {
  if (!sleepTime) return null;
  return sleepDate ?? inferSleepDate(diaryDate, sleepTime);
}

export function calculateSleepDurationHours(
  diaryDate: string,
  sleepTime: string | null | undefined,
  wakeTime: string | null | undefined,
  sleepDate?: string | null,
  wakeDate?: string | null,
): number | null {
  if (!sleepTime || !wakeTime) return null;

  const effectiveSleepDate = resolveSleepDate(diaryDate, sleepTime, sleepDate);
  const effectiveWakeDate = resolveWakeDate(diaryDate, wakeDate);
  if (!effectiveSleepDate || !effectiveWakeDate) return null;

  const sleepMs = new Date(`${effectiveSleepDate}T${sleepTime}:00Z`).getTime();
  let wakeMs = new Date(`${effectiveWakeDate}T${wakeTime}:00Z`).getTime();
  if (wakeMs <= sleepMs) {
    wakeMs = new Date(`${addDays(effectiveWakeDate, 1)}T${wakeTime}:00Z`).getTime();
  }

  const minutes = (wakeMs - sleepMs) / 60000;
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatRuDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

export function formatDateTimeRu(date: string, time: string): string {
  const [y, month, day] = date.split("-");
  return `${day}.${month}.${y} ${time}`;
}
