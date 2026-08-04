import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InsightRow } from "./InsightRow";
import type { ChartDay, PeriodInsights } from "./types";

interface AnalyticsExtraMetricsBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
}

export function AnalyticsExtraMetricsBlock({ chartData, insights }: AnalyticsExtraMetricsBlockProps) {
  return (
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
  );
}
