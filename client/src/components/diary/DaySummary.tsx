// DaySummary.tsx — summary card shown at the top of the day: total КБЖУ
// (via stats bar), water, and sleep/wake data badges. Extracted verbatim from
// DiaryPage.tsx (29.4 refactor).
import { Utensils, Droplets, Activity, Flame, Sun, Moon, Footprints } from "lucide-react";
import type { Day, Meal } from "@shared/schema";
import { formatDateTimeRu, resolveWakeDate, resolveSleepDate } from "@shared/dates";

interface DaySummaryProps {
  day: Day | null | undefined;
  meals: Meal[];
  date: string;
}

export function DaySummary({ day, meals, date }: DaySummaryProps) {
  const totalWater = meals.reduce((s, m) => s + (m.waterUnits ?? 0) * 0.5, 0);
  const avgSatiety = meals.filter((m) => m.satietyAfter != null).length
    ? (
        meals.reduce((s, m) => s + (m.satietyAfter ?? 0), 0) / meals.filter((m) => m.satietyAfter != null).length
      ).toFixed(1)
    : "—";
  const totalKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const hasKcal = meals.some((m) => m.calories != null);

  return (
    <>
      {/* Stats bar */}
      {meals.length > 0 && (
        <div className={`grid gap-2 text-sm ${hasKcal ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
            <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Приёмов:</span>
            <span className="font-medium">{meals.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
            <Droplets className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Вода:</span>
            <span className="font-medium">{totalWater.toFixed(1)} л</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Сытость:</span>
            <span className="font-medium">{avgSatiety}</span>
          </div>
          {hasKcal && (
            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-muted-foreground">Ккал:</span>
              <span className="font-medium">{Math.round(totalKcal)}</span>
            </div>
          )}
        </div>
      )}

      {/* Day summary badge (wake/sleep/steps/sport) — display only, editing happens in DayCommentBox */}
      {day && day.summaryFilled && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 flex-wrap">
            {day.wakeTime && (
              <span className="flex items-center gap-1">
                <Sun className="h-3 w-3" />
                Подъём: <b>{formatDateTimeRu(resolveWakeDate(day.date, day.wakeDate) ?? day.date, day.wakeTime)}</b>
              </span>
            )}
            {day.sleepTime && (
              <span className="flex items-center gap-1">
                <Moon className="h-3 w-3" />
                Отбой:{" "}
                <b>
                  {formatDateTimeRu(
                    resolveSleepDate(day.date, day.sleepTime, day.sleepDate) ?? day.date,
                    day.sleepTime,
                  )}
                </b>
              </span>
            )}
            {day.steps != null && (
              <span className="flex items-center gap-1">
                <Footprints className="h-3 w-3" />
                Шаги: <b>{day.steps}</b>
              </span>
            )}
            {day.sportActivity && (
              <span>
                Спорт: <b>{day.sportActivity}</b>
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
