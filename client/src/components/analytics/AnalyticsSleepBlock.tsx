import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InsightRow } from "./InsightRow";
import type { ChartDay, PeriodInsights } from "./types";

interface AnalyticsSleepBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
}

export function AnalyticsSleepBlock({ chartData, insights }: AnalyticsSleepBlockProps) {
  return (
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
                formatter={(v: number) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`}
              />
              <Legend />
              <Line type="monotone" dataKey="wakeDecimal" name="Подъём" stroke="#16a34a" connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="sleepDecimal" name="Отбой" stroke="#8b5cf6" connectNulls dot={{ r: 2 }} />
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
            value={insights.avgCaloriesSleepDeprived != null ? `${Math.round(insights.avgCaloriesSleepDeprived)}` : "—"}
          />
          <InsightRow
            label="Ккал при нормальном сне"
            value={insights.avgCaloriesNormalSleep != null ? `${Math.round(insights.avgCaloriesNormalSleep)}` : "—"}
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
  );
}
