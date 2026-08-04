import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRuDate } from "@shared/dates";
import type { MealType } from "@shared/analytics";
import { InsightRow } from "./InsightRow";
import { MEAL_TYPE_COLORS, type ChartDay, type PeriodInsights } from "./types";

interface AnalyticsCaloriesBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
  mealTypePie: Array<{ name: string; value: number }>;
}

export function AnalyticsCaloriesBlock({ chartData, insights, mealTypePie }: AnalyticsCaloriesBlockProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Блок 2 — Калорийность и КБЖУ</CardTitle>
        <CardDescription>Дневная калорийность, скользящее среднее 7 дней, распределение по приёмам.</CardDescription>
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
                  <Pie data={mealTypePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
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
            value={insights.avgCaloriesWithActivity != null ? `${Math.round(insights.avgCaloriesWithActivity)}` : "—"}
          />
          <InsightRow
            label="Без активности"
            value={
              insights.avgCaloriesWithoutActivity != null ? `${Math.round(insights.avgCaloriesWithoutActivity)}` : "—"
            }
          />
        </div>
        {insights.topCalorieDays.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Топ-5 калорийных дней</div>
            {insights.topCalorieDays.map((d) => (
              <InsightRow key={d.date} label={formatRuDate(d.date)} value={`${Math.round(d.totalCalories)} ккал`} />
            ))}
          </div>
        )}
        {chartData.some((d) => d.kbjuMissing) && (
          <p className="text-xs text-muted-foreground">Серые дни с записями без КБЖУ — данные DeepSeek не заполнены.</p>
        )}
      </CardContent>
    </Card>
  );
}
