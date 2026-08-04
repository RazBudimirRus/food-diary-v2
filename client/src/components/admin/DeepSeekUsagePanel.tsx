import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, Zap, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { DeepSeekCheckResult, DeepSeekUsageSummary } from "./types";

export function DeepSeekUsagePanel() {
  const {
    data: deepseekUsage,
    isLoading: deepseekLoading,
    error: deepseekError,
  } = useQuery<DeepSeekUsageSummary>({
    queryKey: ["/api/admin/deepseek/usage"],
  });
  const [dsCheck, setDsCheck] = useState<DeepSeekCheckResult | null>(null);
  const [dsCheckLoading, setDsCheckLoading] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            DeepSeek usage
          </CardTitle>
          <CardDescription>Токены и примерная стоимость КБЖУ-анализа за последние 30 дней.</CardDescription>
        </CardHeader>
        <CardContent>
          {deepseekLoading && <p className="text-sm text-muted-foreground">Загрузка usage...</p>}
          {deepseekError && <p className="text-sm text-destructive">Не удалось загрузить DeepSeek usage</p>}
          {!deepseekLoading && !deepseekError && deepseekUsage && (
            <div className="space-y-4">
              <div
                className={`rounded-lg border px-4 py-3 ${
                  deepseekUsage.dailyLimitExceeded
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="text-sm font-medium">
                  Сегодня: {deepseekUsage.todayTokens.toLocaleString("ru-RU")} токенов
                  {deepseekUsage.dailyTokenLimit > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      / лимит {deepseekUsage.dailyTokenLimit.toLocaleString("ru-RU")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {deepseekUsage.analysisBlocked
                    ? "КБЖУ-анализ временно заблокирован до следующего дня."
                    : "КБЖУ-анализ разрешён, дневной лимит не превышен."}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Запросов</div>
                  <div className="text-lg font-semibold">{deepseekUsage.totalRequests}</div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Токены</div>
                  <div className="text-lg font-semibold">{deepseekUsage.totalTokens.toLocaleString("ru-RU")}</div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Input / output</div>
                  <div className="text-lg font-semibold">
                    {deepseekUsage.tokensIn.toLocaleString("ru-RU")} / {deepseekUsage.tokensOut.toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Оценка стоимости</div>
                  <div className="text-lg font-semibold">${deepseekUsage.costEstimate.toFixed(4)}</div>
                </div>
              </div>

              {deepseekUsage.byDay.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Запросы</TableHead>
                      <TableHead>Токены</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Output</TableHead>
                      <TableHead>Стоимость</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deepseekUsage.byDay.slice(0, 7).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{day.date}</TableCell>
                        <TableCell>{day.requests}</TableCell>
                        <TableCell>{day.totalTokens.toLocaleString("ru-RU")}</TableCell>
                        <TableCell>{day.tokensIn.toLocaleString("ru-RU")}</TableCell>
                        <TableCell>{day.tokensOut.toLocaleString("ru-RU")}</TableCell>
                        <TableCell>${day.costEstimate.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADMIN-1: DeepSeek check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            DeepSeek API — проверка
          </CardTitle>
          <CardDescription>
            Реальный запрос к DeepSeek: расчёт КБЖУ для тестового блюда. Показывает время ответа и результат.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            disabled={dsCheckLoading}
            onClick={async () => {
              setDsCheckLoading(true);
              setDsCheck(null);
              try {
                const res = await apiRequest("GET", "/api/admin/deepseek-check");
                const json = await res.json();
                setDsCheck(json as DeepSeekCheckResult);
              } catch (err) {
                setDsCheck({ ok: false, durationMs: 0, detail: String(err) });
              } finally {
                setDsCheckLoading(false);
              }
            }}
          >
            {dsCheckLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Проверяю...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Проверить DeepSeek
              </>
            )}
          </Button>
          {dsCheck && (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${dsCheck.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}`}
              >
                {dsCheck.ok ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Работает · {dsCheck.durationMs}мс
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Недоступен · {dsCheck.durationMs}мс
                  </>
                )}
              </div>
              {dsCheck.detail && <p className="text-xs text-destructive font-mono break-all">{dsCheck.detail}</p>}
              {dsCheck.result && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>
                    Два яйца варёных → <b>{dsCheck.result.calories}</b> ккал · Б {dsCheck.result.protein}г · Ж{" "}
                    {dsCheck.result.fat}г · У {dsCheck.result.carbs}г
                  </div>
                  {dsCheck.result.note && <div className="italic mt-0.5">{dsCheck.result.note}</div>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
