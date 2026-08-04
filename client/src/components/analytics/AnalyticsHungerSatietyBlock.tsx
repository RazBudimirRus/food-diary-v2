import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
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

interface AnalyticsHungerSatietyBlockProps {
  chartData: ChartDay[];
  insights: PeriodInsights;
  hungerHistData: Array<{ score: string; count: number }>;
  satietyHistData: Array<{ score: string; count: number }>;
}

export function AnalyticsHungerSatietyBlock({
  chartData,
  insights,
  hungerHistData,
  satietyHistData,
}: AnalyticsHungerSatietyBlockProps) {
  return (
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
              <Line type="monotone" dataKey="avgHunger" name="Голод до" stroke="#f59e0b" connectNulls dot={{ r: 2 }} />
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
  );
}
