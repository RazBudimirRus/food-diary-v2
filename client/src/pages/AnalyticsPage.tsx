import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAppTheme } from "@/App";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  LogOut,
  Moon,
  MoreVertical,
  Sun,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AnalyticsPeriodType,
  formatAnalyticsPeriodLabel,
  formatRuDate,
  getAnalyticsPeriodRange,
  mskToday,
  shiftAnalyticsAnchor,
} from "@shared/dates";
import { isLongGap, timeToDecimalHours, type MealType } from "@shared/analytics";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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
  wakeTime: string | null;
  sleepTime: string | null;
  steps: number | null;
  sportActivity: string | null;
  firstMealTime: string | null;
  lastMealTime: string | null;
  eatingWindowHours: number | null;
  avgGapHours: number | null;
  maxGapHours: number | null;
  lateCaloriesRatio: number | null;
  overeatingCount: number;
  hasKbjuData: boolean;
  sleepDebt: number | null;
  rollingAvgCalories7: number | null;
}

interface PeriodInsights {
  avgCaloriesWeekday: number | null;
  avgCaloriesWeekend: number | null;
  avgCaloriesWithActivity: number | null;
  avgCaloriesWithoutActivity: number | null;
  avgCaloriesSleepDeprived: number | null;
  avgCaloriesNormalSleep: number | null;
  avgHungerSleepDeprived: number | null;
  avgHungerNormalSleep: number | null;
  topCalorieDays: Array<{ date: string; totalCalories: number }>;
  topContexts: Array<{ context: string; count: number }>;
  hungerHistogram: Record<number, number>;
  satietyHistogram: Record<number, number>;
  greenZoneRatio: number;
  totalOvereating: number;
  caloriesStdDev: number | null;
  avgSteps: number | null;
  activityDays: number;
  calorieDistributionByMealType: Record<MealType, number>;
  skippedMealTypes: MealType[];
  avgEatingWindowHours: number | null;
  lateDinnerDays: number;
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
  insights: PeriodInsights;
}

const PERIODS: { label: string; type: AnalyticsPeriodType }[] = [
  { label: "Неделя", type: "week" },
  { label: "Месяц", type: "month" },
  { label: "3 мес", type: "quarter" },
  { label: "6 мес", type: "half" },
  { label: "Год", type: "year" },
];

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  завтрак: "#16a34a",
  обед: "#3b82f6",
  перекус: "#f59e0b",
  ужин: "#8b5cf6",
};

const HISTOGRAM_KEYS = Array.from({ length: 11 }, (_, i) => i);

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

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
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
              <Button size="sm" variant="outline" onClick={downloadCsv} data-testid="btn-analytics-csv">
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
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
            {/* Mobile dropdown: Дневник + Выйти */}
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
            {/* Desktop logout */}
            <Button size="icon" variant="ghost" className="h-8 w-8 hidden sm:flex" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
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
          <Button variant="outline" size="icon" onClick={() => shiftPeriod(-1)} data-testid="btn-analytics-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-center" data-testid="analytics-period-label">
            {formatAnalyticsPeriodLabel(periodType, range.from, range.to)}
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

        {data && insights && (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Заполнено дней</div>
                  <div className="text-2xl font-semibold">
                    {data.summary.filledDays}/{data.summary.periodDays}
                  </div>
                  <div className="text-xs text-muted-foreground">{Math.round(data.summary.filledDaysRatio * 100)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Средние ккал</div>
                  <div className="text-2xl font-semibold">{Math.round(data.summary.avgCalories)}</div>
                  {insights.caloriesStdDev != null && (
                    <div className="text-xs text-muted-foreground">σ {insights.caloriesStdDev}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Сон / вода</div>
                  <div className="text-2xl font-semibold">
                    {data.summary.avgSleep != null ? `${data.summary.avgSleep} ч` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.summary.totalWaterLitres.toFixed(1)} л всего
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Стрик / приёмы</div>
                  <div className="text-2xl font-semibold">
                    {data.summary.currentStreak} / {data.summary.totalMeals}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    «Зелёная зона» {Math.round(insights.greenZoneRatio * 100)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Block 1 — Sleep */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 1 — Сон</CardTitle>
                <CardDescription>Подъём, отбой, продолжительность и накопленный «долг сна» (цель 8 ч).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis domain={[0, 24]} tickFormatter={(v) => `${v}:00`} />
                      <Tooltip
                        formatter={(v: number) =>
                          `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="wakeDecimal"
                        name="Подъём"
                        stroke="#16a34a"
                        connectNulls
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sleepDecimal"
                        name="Отбой"
                        stroke="#8b5cf6"
                        connectNulls
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sleepDuration" name="Сон, ч" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="sleepDebt" name="Долг сна, ч" stroke="#ef4444" fill="#fecaca" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InsightRow
                    label="Ккал при недосыпе (<6 ч)"
                    value={
                      insights.avgCaloriesSleepDeprived != null
                        ? `${Math.round(insights.avgCaloriesSleepDeprived)}`
                        : "—"
                    }
                  />
                  <InsightRow
                    label="Ккал при нормальном сне"
                    value={
                      insights.avgCaloriesNormalSleep != null ? `${Math.round(insights.avgCaloriesNormalSleep)}` : "—"
                    }
                  />
                  <InsightRow
                    label="Голод при недосыпе"
                    value={insights.avgHungerSleepDeprived != null ? `${insights.avgHungerSleepDeprived}` : "—"}
                  />
                  <InsightRow
                    label="Голод при нормальном сне"
                    value={insights.avgHungerNormalSleep != null ? `${insights.avgHungerNormalSleep}` : "—"}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Block 2 — Calories & macros */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 2 — Калорийность и КБЖУ</CardTitle>
                <CardDescription>
                  Дневная калорийность, скользящее среднее 7 дней, распределение по приёмам.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalCalories" name="Ккал/день" fill="#94a3b8" opacity={0.35} />
                      <Line
                        type="monotone"
                        dataKey="totalCalories"
                        name="Ккал"
                        stroke="currentColor"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rollingAvgCalories7"
                        name="Ср. 7 дней"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        connectNulls
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="protein" name="Белки" stackId="macros" fill="#16a34a" />
                        <Bar dataKey="fat" name="Жиры" stackId="macros" fill="#f59e0b" />
                        <Bar dataKey="carbs" name="Углеводы" stackId="macros" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64">
                    {mealTypePie.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={mealTypePie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label
                          >
                            {mealTypePie.map((entry) => (
                              <Cell key={entry.name} fill={MEAL_TYPE_COLORS[entry.name as MealType]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground p-4">Нет данных КБЖУ за период</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InsightRow
                    label="Будни (ср. ккал)"
                    value={insights.avgCaloriesWeekday != null ? `${Math.round(insights.avgCaloriesWeekday)}` : "—"}
                  />
                  <InsightRow
                    label="Выходные (ср. ккал)"
                    value={insights.avgCaloriesWeekend != null ? `${Math.round(insights.avgCaloriesWeekend)}` : "—"}
                  />
                  <InsightRow
                    label="С активностью"
                    value={
                      insights.avgCaloriesWithActivity != null ? `${Math.round(insights.avgCaloriesWithActivity)}` : "—"
                    }
                  />
                  <InsightRow
                    label="Без активности"
                    value={
                      insights.avgCaloriesWithoutActivity != null
                        ? `${Math.round(insights.avgCaloriesWithoutActivity)}`
                        : "—"
                    }
                  />
                </div>
                {insights.topCalorieDays.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Топ-5 калорийных дней</div>
                    {insights.topCalorieDays.map((d) => (
                      <InsightRow
                        key={d.date}
                        label={formatRuDate(d.date)}
                        value={`${Math.round(d.totalCalories)} ккал`}
                      />
                    ))}
                  </div>
                )}
                {chartData.some((d) => d.kbjuMissing) && (
                  <p className="text-xs text-muted-foreground">
                    Серые дни с записями без КБЖУ — данные DeepSeek не заполнены.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Block 3 — Meal gaps */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 3 — Перерывы между приёмами</CardTitle>
                <CardDescription>Окно питания, первый/последний приём, перерывы &gt;5 ч подсвечены.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} name="День" />
                        <YAxis dataKey="avgGapHours" name="Ср. перерыв, ч" />
                        <ZAxis dataKey="mealsCount" range={[40, 200]} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter
                          name="Ср. перерыв"
                          data={chartData.filter((d) => d.avgGapHours != null)}
                          fill="#3b82f6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval="preserveStartEnd" />
                        <YAxis domain={[0, 24]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="firstMealDecimal"
                          name="Первый приём"
                          stroke="#16a34a"
                          connectNulls
                          dot={{ r: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="lastMealDecimal"
                          name="Последний приём"
                          stroke="#ef4444"
                          connectNulls
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="eatingWindowHours" name="Окно питания, ч">
                        {chartData.map((entry) => (
                          <Cell key={entry.date} fill={entry.longGap ? "#ef4444" : "#3b82f6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InsightRow
                    label="Ср. окно питания"
                    value={insights.avgEatingWindowHours != null ? `${insights.avgEatingWindowHours} ч` : "—"}
                  />
                  <InsightRow label="Дней с ужином после 21:00" value={String(insights.lateDinnerDays)} />
                </div>
              </CardContent>
            </Card>

            {/* Block 4 — Hunger & satiety */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 4 — Голод и насыщение</CardTitle>
                <CardDescription>Средние оценки, гистограммы и переедания (насыщение ≥8).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgHunger"
                        name="Голод до"
                        stroke="#f59e0b"
                        connectNulls
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgSatiety"
                        name="Насыщение после"
                        stroke="#16a34a"
                        connectNulls
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hungerHistData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="score" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Голод" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={satietyHistData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="score" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Насыщение" fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InsightRow label="Перееданий (≥8)" value={String(insights.totalOvereating)} />
                  <InsightRow label="«Зелёная зона»" value={`${Math.round(insights.greenZoneRatio * 100)}%`} />
                </div>
              </CardContent>
            </Card>

            {/* Block 5 — Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 5 — Активность и шаги</CardTitle>
                <CardDescription>Шаги по дням с целевой линией 10 000.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="steps" name="Шаги" fill="#0ea5e9" />
                      <ReferenceLine y={10000} label="10k" stroke="#ef4444" strokeDasharray="4 4" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <InsightRow
                    label="Ср. шагов"
                    value={insights.avgSteps != null ? `${Math.round(insights.avgSteps)}` : "—"}
                  />
                  <InsightRow label="Дней с активностью" value={String(insights.activityDays)} />
                </div>
              </CardContent>
            </Card>

            {/* Block 6 — Extra metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Блок 6 — Дополнительные метрики</CardTitle>
                <CardDescription>Контексты, пропуски типов приёмов, вода, вечернее питание.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.skippedMealTypes.length > 0 && (
                  <p className="text-sm">
                    Чаще пропускается: <span className="font-medium">{insights.skippedMealTypes.join(", ")}</span>
                  </p>
                )}
                {insights.topContexts.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Топ контекстов</div>
                    {insights.topContexts.map((c) => (
                      <InsightRow key={c.context} label={c.context} value={`${c.count}×`} />
                    ))}
                  </div>
                )}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="waterLitres"
                        name="Вода, л"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
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
