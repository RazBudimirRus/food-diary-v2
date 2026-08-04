import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsResponse, PeriodInsights } from "./types";

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsResponse["summary"];
  insights: PeriodInsights;
}

export function AnalyticsSummaryCards({ summary, insights }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Заполнено дней</div>
          <div className="text-2xl font-semibold">
            {summary.filledDays}/{summary.periodDays}
          </div>
          <div className="text-xs text-muted-foreground">{Math.round(summary.filledDaysRatio * 100)}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Средние ккал</div>
          <div className="text-2xl font-semibold">{Math.round(summary.avgCalories)}</div>
          {insights.caloriesStdDev != null && (
            <div className="text-xs text-muted-foreground">σ {insights.caloriesStdDev}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Сон / вода</div>
          <div className="text-2xl font-semibold">{summary.avgSleep != null ? `${summary.avgSleep} ч` : "—"}</div>
          <div className="text-xs text-muted-foreground">{summary.totalWaterLitres.toFixed(1)} л всего</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Стрик / приёмы</div>
          <div className="text-2xl font-semibold">
            {summary.currentStreak} / {summary.totalMeals}
          </div>
          <div className="text-xs text-muted-foreground">
            «Зелёная зона» {Math.round(insights.greenZoneRatio * 100)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
