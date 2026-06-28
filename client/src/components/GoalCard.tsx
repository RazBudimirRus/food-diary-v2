/**
 * GoalCard — Фаза 18.
 * Карточка «Цель на сегодня» с прогресс-барами КБЖУ.
 * Показывает план от врача или из профиля.
 */
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ActivePlan {
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  waterMl?: number | null;
  notes?: string | null;
}

interface GoalCardProps {
  /** Текущий итог за день (из meals) */
  todayKcal: number;
  todayProtein: number;
  todayFat: number;
  todayCarbs: number;
  todayWaterL?: number;
}

function ProgressBar({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 120) : 0;
  const color = pct < 80 ? "bg-blue-500" : pct <= 120 ? "bg-green-500" : "bg-red-500";

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {Math.round(value)}
          {unit} / {Math.round(max)}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function GoalCard({ todayKcal, todayProtein, todayFat, todayCarbs, todayWaterL }: GoalCardProps) {
  const { data, isLoading } = useQuery<{ plan: ActivePlan | null; source: string }>({
    queryKey: ["/api/user/active-plan"],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data?.plan) return null;

  const { plan, source } = data;
  const hasAnyTarget = plan.kcal || plan.protein || plan.fat || plan.carbs;
  if (!hasAnyTarget) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Target className="h-4 w-4" />
          <span>Цель на сегодня</span>
          {source === "doctor" && <span className="text-xs font-normal text-muted-foreground ml-auto">от врача</span>}
        </div>

        <div className="space-y-2">
          {plan.kcal ? <ProgressBar value={todayKcal} max={plan.kcal} label="Калории" unit=" ккал" /> : null}
          {plan.protein ? <ProgressBar value={todayProtein} max={plan.protein} label="Белки" unit=" г" /> : null}
          {plan.fat ? <ProgressBar value={todayFat} max={plan.fat} label="Жиры" unit=" г" /> : null}
          {plan.carbs ? <ProgressBar value={todayCarbs} max={plan.carbs} label="Углеводы" unit=" г" /> : null}
          {plan.waterMl && todayWaterL != null ? (
            <ProgressBar value={todayWaterL * 1000} max={plan.waterMl} label="Вода" unit=" мл" />
          ) : null}
        </div>

        {plan.notes && <p className="text-xs text-muted-foreground italic border-t pt-2 mt-1">{plan.notes}</p>}
      </CardContent>
    </Card>
  );
}
