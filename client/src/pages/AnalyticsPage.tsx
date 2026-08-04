import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useAppTheme } from "@/lib/theme-context";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, BarChart3, Download, FileText, LogOut, Moon, MoreVertical, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AnalyticsPeriodType,
  formatRuDate,
  getAnalyticsPeriodRange,
  mskToday,
  shiftAnalyticsAnchor,
} from "@shared/dates";
import { isLongGap, timeToDecimalHours, type MealType } from "@shared/analytics";
import { AnalyticsPeriodControls } from "@/components/analytics/AnalyticsPeriodControls";
import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { AnalyticsSleepBlock } from "@/components/analytics/AnalyticsSleepBlock";
import { AnalyticsCaloriesBlock } from "@/components/analytics/AnalyticsCaloriesBlock";
import { AnalyticsMealGapsBlock } from "@/components/analytics/AnalyticsMealGapsBlock";
import { AnalyticsHungerSatietyBlock } from "@/components/analytics/AnalyticsHungerSatietyBlock";
import { AnalyticsActivityBlock } from "@/components/analytics/AnalyticsActivityBlock";
import { AnalyticsExtraMetricsBlock } from "@/components/analytics/AnalyticsExtraMetricsBlock";
import { HISTOGRAM_KEYS, type AnalyticsResponse } from "@/components/analytics/types";

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAppTheme();
  const [location] = useLocation();
  const [periodType, setPeriodType] = useState<AnalyticsPeriodType>("month");
  const [anchorDate, setAnchorDate] = useState(mskToday());
  const range = useMemo(() => getAnalyticsPeriodRange(periodType, anchorDate), [periodType, anchorDate]);
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: [`/api/analytics/summary?from=${range.from}&to=${range.to}`],
  });

  const days = data?.days ?? [];
  const insights = data?.insights;

  const chartData = days.map((day) => ({
    ...day,
    label: formatRuDate(day.date),
    sleepDuration: day.sleepDuration ?? 0,
    wakeDecimal: day.wakeTime ? timeToDecimalHours(day.wakeTime) : null,
    sleepDecimal: day.sleepTime ? timeToDecimalHours(day.sleepTime) : null,
    firstMealDecimal: day.firstMealTime ? timeToDecimalHours(day.firstMealTime) : null,
    lastMealDecimal: day.lastMealTime ? timeToDecimalHours(day.lastMealTime) : null,
    longGap: isLongGap(day.maxGapHours),
    filled: day.mealsCount > 0,
    kbjuMissing: day.mealsCount > 0 && !day.hasKbjuData,
  }));

  const mealTypePie = insights
    ? (Object.entries(insights.calorieDistributionByMealType) as [MealType, number][])
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const hungerHistData = HISTOGRAM_KEYS.map((score) => ({
    score: String(score),
    count: insights?.hungerHistogram[score] ?? 0,
  }));

  const satietyHistData = HISTOGRAM_KEYS.map((score) => ({
    score: String(score),
    count: insights?.satietyHistogram[score] ?? 0,
  }));

  function selectPeriod(type: AnalyticsPeriodType) {
    setPeriodType(type);
    setAnchorDate(mskToday());
  }

  function shiftPeriod(delta: -1 | 1) {
    setAnchorDate(shiftAnalyticsAnchor(anchorDate, periodType, delta));
  }

  async function downloadPdf() {
    if (!data) return;
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      const res = await apiRequest("GET", `/api/report/analytics-pdf?from=${range.from}&to=${range.to}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Ошибка генерации PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Аналитика_питания_${range.from}_${range.to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Ошибка соединения с сервером");
    }
  }

  function downloadCsv() {
    if (!data) return;
    exportCsv(`analytics-${range.from}-${range.to}.csv`, [
      [
        "date",
        "meals",
        "calories",
        "protein",
        "fat",
        "carbs",
        "water_l",
        "sleep_h",
        "steps",
        "eating_window_h",
        "max_gap_h",
      ],
      ...data.days.map((d) => [
        d.date,
        String(d.mealsCount),
        String(d.totalCalories),
        String(d.protein),
        String(d.fat),
        String(d.carbs),
        String(d.waterLitres),
        d.sleepDuration != null ? String(d.sleepDuration) : "",
        d.steps != null ? String(d.steps) : "",
        d.eatingWindowHours != null ? String(d.eatingWindowHours) : "",
        d.maxGapHours != null ? String(d.maxGapHours) : "",
      ]),
    ]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base">Аналитика питания</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hidden sm:flex" asChild>
              <a href="#/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Дневник
              </a>
            </Button>
            {data && (
              <>
                <Button size="sm" variant="outline" onClick={downloadCsv} data-testid="btn-analytics-csv">
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button size="sm" variant="outline" onClick={downloadPdf} data-testid="btn-analytics-pdf">
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.username}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={toggleTheme}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              data-testid="btn-toggle-theme-analytics"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 sm:hidden" aria-label="Меню">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href="#/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Дневник
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" className="h-8 w-8 hidden sm:flex" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
        <AnalyticsPeriodControls
          periodType={periodType}
          onSelectPeriod={selectPeriod}
          onShiftPeriod={shiftPeriod}
          rangeFrom={range.from}
          rangeTo={range.to}
        />

        {isLoading && (
          <div className="space-y-3">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive">Не удалось загрузить аналитику</p>}

        {data && insights && (
          <>
            <AnalyticsSummaryCards summary={data.summary} insights={insights} />
            <AnalyticsSleepBlock chartData={chartData} insights={insights} />
            <AnalyticsCaloriesBlock chartData={chartData} insights={insights} mealTypePie={mealTypePie} />
            <AnalyticsMealGapsBlock chartData={chartData} insights={insights} />
            <AnalyticsHungerSatietyBlock
              chartData={chartData}
              insights={insights}
              hungerHistData={hungerHistData}
              satietyHistData={satietyHistData}
            />
            <AnalyticsActivityBlock chartData={chartData} insights={insights} />
            <AnalyticsExtraMetricsBlock chartData={chartData} insights={insights} />
          </>
        )}
      </main>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />
    </div>
  );
}
