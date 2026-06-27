import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, BarChart3, LogOut } from "lucide-react";
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

const PERIODS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "365 дней", days: 365 },
];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days + 1);
  return { from: formatDate(from), to: formatDate(to) };
}

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const [periodDays, setPeriodDays] = useState(30);
  const range = useMemo(() => getDateRange(periodDays), [periodDays]);
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: [`/api/analytics/summary?from=${range.from}&to=${range.to}`],
  });

  const days = data?.days ?? [];
  const chartData = days.map((day) => ({
    ...day,
    label: shortDate(day.date),
    sleepDuration: day.sleepDuration ?? 0,
  }));

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
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.displayName || user?.username}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((period) => (
            <Button
              key={period.days}
              variant={periodDays === period.days ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodDays(period.days)}
              data-testid={`btn-analytics-period-${period.days}`}
            >
              {period.label}
            </Button>
          ))}
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

            {days.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  За выбранный период пока нет данных.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Калорийность по дням</CardTitle>
                    <CardDescription>Сумма КБЖУ-оценок из записей за каждый день.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="totalCalories" name="Ккал" stroke="currentColor" strokeWidth={2} />
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
                          <XAxis dataKey="label" />
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
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="sleepDuration" name="Сон, ч" stroke="#8b5cf6" strokeWidth={2} />
                          <Line type="monotone" dataKey="waterLitres" name="Вода, л" stroke="#0ea5e9" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
