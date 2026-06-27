import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import {
  type CalendarPeriodType,
  formatRuDate,
  getCalendarPeriodRange,
  mskToday,
  shiftCalendarAnchor,
} from "@shared/dates";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsDay {
  date: string;
  mealsCount: number;
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  waterLitres: number;
  avgHunger: number | null;
  avgSatiety: number | null;
  sleepDuration: number | null;
  steps: number | null;
}

interface AnalyticsResponse {
  days: AnalyticsDay[];
  summary: {
    filledDays: number;
    periodDays: number;
    filledDaysRatio: number;
    currentStreak: number;
    avgCalories: number;
    avgSleep: number | null;
    totalCalories: number;
    totalWaterLitres: number;
    totalMeals: number;
  };
}

const PERIODS: { label: string; type: CalendarPeriodType }[] = [
  { label: "Неделя", type: "week" },
  { label: "Месяц", type: "month" },
  { label: "Год", type: "year" },
];

const MONTH_NAMES = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatPeriodLabel(type: CalendarPeriodType, from: string, to: string): string {
  if (type === "week") {
    return `${formatRuDate(from)} — ${formatRuDate(to)}`;
  }
  if (type === "month") {
    const [year, month] = from.split("-");
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  }
  return from.slice(0, 4);
}

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const [periodType, setPeriodType] = useState<CalendarPeriodType>("month");
  const [anchorDate, setAnchorDate] = useState(mskToday());
  const range = useMemo(
    () => getCalendarPeriodRange(periodType, anchorDate),
    [periodType, anchorDate],
  );
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: [`/api/analytics/summary?from=${range.from}&to=${range.to}`],
  });

  const days = data?.days ?? [];
  const chartData = days.map((day) => ({
    ...day,
    label: formatRuDate(day.date),
    sleepDuration: day.sleepDuration ?? 0,
  }));

  function selectPeriod(type: CalendarPeriodType) {
    setPeriodType(type);
    setAnchorDate(mskToday());
  }

  function shiftPeriod(delta: -1 | 1) {
    setAnchorDate(shiftCalendarAnchor(anchorDate, periodType, delta));
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
            <Button size="sm" variant="outline" asChild>
              <a href="#/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Дневник
              </a>
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.username}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((period) => (
            <Button
              key={period.type}
              variant={periodType === period.type ? "default" : "outline"}
              size="sm"
              onClick={() => selectPeriod(period.type)}
              data-testid={`btn-analytics-period-${period.type}`}
            >
              {period.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => shiftPeriod(-1)}
            data-testid="btn-analytics-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-center" data-testid="analytics-period-label">
            {formatPeriodLabel(periodType, range.from, range.to)}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => shiftPeriod(1)}
            disabled={range.to >= mskToday()}
            data-testid="btn-analytics-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Загрузка аналитики...</p>}
        {error && <p className="text-sm text-destructive">Не удалось загрузить аналитику</p>}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Заполнено дней</div>
                  <div className="text-2xl font-semibold">{data.summary.filledDays}/{data.summary.periodDays}</div>
                  <div className="text-xs text-muted-foreground">{Math.round(data.summary.filledDaysRatio * 100)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Средние ккал</div>
                  <div className="text-2xl font-semibold">{Math.round(data.summary.avgCalories)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Приёмов пищи</div>
                  <div className="text-2xl font-semibold">{data.summary.totalMeals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Стрик</div>
                  <div className="text-2xl font-semibold">{data.summary.currentStreak}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Калорийность по дням</CardTitle>
                  <CardDescription>Сумма КБЖУ-оценок из записей за каждый день. Пустые дни — нули.</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="totalCalories" name="Ккал" stroke="currentColor" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>БЖУ</CardTitle>
                    <CardDescription>Белки, жиры, углеводы по дням.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="protein" name="Белки" stackId="macros" fill="#16a34a" />
                        <Bar dataKey="fat" name="Жиры" stackId="macros" fill="#f59e0b" />
                        <Bar dataKey="carbs" name="Углеводы" stackId="macros" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Сон и вода</CardTitle>
                    <CardDescription>Длительность сна и объём воды за день.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="sleepDuration" name="Сон, ч" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="waterLitres" name="Вода, л" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
