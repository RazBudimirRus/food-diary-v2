import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { InsightRow } from "./InsightRow";
import type { ChartDay, PeriodInsights } from "./types";

interface AnalyticsMealGapsBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
}

export function AnalyticsMealGapsBlock({ chartData, insights }: AnalyticsMealGapsBlockProps) {
  return (
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
                <Scatter name="Ср. перерыв" data={chartData.filter((d) => d.avgGapHours != null)} fill="#3b82f6" />
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
  );
}
