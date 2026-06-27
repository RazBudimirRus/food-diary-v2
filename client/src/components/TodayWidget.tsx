/**
 * TodayWidget — compact summary banner shown only for today's date.
 * Shows: kcal progress, water, meals count, steps (if filled).
 * Appears above the stats bar as a motivational at-a-glance row.
 */
import { Flame, Droplets, Utensils, Footprints, TrendingUp } from "lucide-react";

interface TodayWidgetProps {
  mealsCount: number;
  totalKcal: number;
  totalWater: number;   // litres
  steps: number | null | undefined;
  hasKcal: boolean;
}

// Rough daily targets for visual progress
const KCAL_TARGET = 2000;
const WATER_TARGET = 2.0; // litres

function ProgressArc({ pct, color }: { pct: number; color: string }) {
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 1));
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      <circle cx="14" cy="14" r={r} strokeWidth="3" className="stroke-muted" fill="none" />
      <circle
        cx="14" cy="14" r={r}
        strokeWidth="3"
        fill="none"
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export function TodayWidget({ mealsCount, totalKcal, totalWater, steps, hasKcal }: TodayWidgetProps) {
  const kcalPct = hasKcal ? totalKcal / KCAL_TARGET : 0;
  const waterPct = totalWater / WATER_TARGET;

  return (
    <div className="flex items-center gap-2 flex-wrap bg-gradient-to-r from-primary/8 to-transparent
                    border border-primary/20 rounded-xl px-3.5 py-2.5 text-sm"
         data-testid="widget-today">
      {/* Label */}
      <span className="flex items-center gap-1 font-medium text-primary/90 mr-1">
        <TrendingUp className="h-3.5 w-3.5" />
        Сегодня
      </span>

      {/* Meals */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Utensils className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{mealsCount}</span>
        <span className="text-xs">приём{mealsCount === 1 ? "" : mealsCount < 5 ? "а" : "ов"}</span>
      </div>

      <span className="text-muted-foreground/30">·</span>

      {/* Kcal */}
      {hasKcal ? (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ProgressArc pct={kcalPct} color="var(--color-primary, #3d6b52)" />
          <span className="font-medium text-foreground">{Math.round(totalKcal)}</span>
          <span className="text-xs">/ {KCAL_TARGET} ккал</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-orange-400/60" />
          <span className="text-xs">КБЖУ не заполнено</span>
        </div>
      )}

      <span className="text-muted-foreground/30">·</span>

      {/* Water */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <ProgressArc pct={waterPct} color="#3b82f6" />
        <span className="font-medium text-foreground">{totalWater.toFixed(1)}</span>
        <span className="text-xs">/ {WATER_TARGET} л воды</span>
      </div>

      {/* Steps — optional */}
      {steps != null && steps > 0 && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Footprints className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{steps.toLocaleString("ru")}</span>
            <span className="text-xs">шагов</span>
          </div>
        </>
      )}
    </div>
  );
}
