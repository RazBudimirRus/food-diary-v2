import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InsightRow } from "./InsightRow";
import type { ChartDay, PeriodInsights } from "./types";

interface AnalyticsActivityBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
}

export function AnalyticsActivityBlock({ chartData, insights }: AnalyticsActivityBlockProps) {
  return (
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
          <InsightRow label="Ср. шагов" value={insights.avgSteps != null ? `${Math.round(insights.avgSteps)}` : "—"} />
          <InsightRow label="Дней с активностью" value={String(insights.activityDays)} />
        </div>
      </CardContent>
    </Card>
  );
}
