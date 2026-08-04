import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { HardDrive, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { S3BucketStats, S3TestResult, S3UploadTestResult } from "./types";

export function S3AdminPanel() {
  const [s3TestResult, setS3TestResult] = useState<S3TestResult | null>(null);
  const [s3TestLoading, setS3TestLoading] = useState(false);
  const [s3Stats, setS3Stats] = useState<S3BucketStats | null>(null);
  const [s3StatsLoading, setS3StatsLoading] = useState(false);
  const [s3UploadTest, setS3UploadTest] = useState<S3UploadTestResult | null>(null);
  const [s3UploadTestLoading, setS3UploadTestLoading] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            S3 хранилище
          </CardTitle>
          <CardDescription>
            Проверка доступности VK Object Storage: запись, чтение и удаление тестового файла.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            disabled={s3TestLoading}
            onClick={async () => {
              setS3TestLoading(true);
              setS3TestResult(null);
              try {
                const res = await apiRequest("POST", "/api/admin/s3-test");
                const json = await res.json();
                setS3TestResult(json);
              } catch (err) {
                setS3TestResult({
                  ok: false,
                  steps: {
                    put: { ok: false, durationMs: 0, detail: "" },
                    get: { ok: false, durationMs: 0, detail: "" },
                    delete: { ok: false, durationMs: 0, detail: "" },
                  },
                  error: String(err),
                });
              } finally {
                setS3TestLoading(false);
              }
            }}
            data-testid="btn-s3-test"
          >
            {s3TestLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Проверить S3
              </>
            )}
          </Button>
          {s3TestResult && (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  s3TestResult.ok ? "text-green-700 dark:text-green-400" : "text-destructive"
                }`}
              >
                {s3TestResult.ok ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    S3 доступен и работает
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    S3 недоступен
                  </>
                )}
              </div>
              {s3TestResult.error && <p className="text-xs text-destructive font-mono">{s3TestResult.error}</p>}
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { key: "put", label: "PutObject" },
                    { key: "get", label: "GetObject" },
                    { key: "delete", label: "DeleteObject" },
                  ] as const
                ).map(({ key, label }) => {
                  const step = s3TestResult.steps[key];
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 ${
                        step.ok
                          ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                          : "border-destructive bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {step.ok ? (
                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive" />
                        )}
                        {label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.durationMs}ms</div>
                      {step.detail && (
                        <div className="text-xs text-muted-foreground truncate" title={step.detail}>
                          {step.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UX-S3-2: Upload Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            S3 загрузка (реальный тест)
          </CardTitle>
          <CardDescription>
            Загружает реальный WebP-файл через тот же pipeline что и фото пользователей: sharp → PutObject → GetObject →
            DeleteObject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            disabled={s3UploadTestLoading}
            onClick={async () => {
              setS3UploadTestLoading(true);
              setS3UploadTest(null);
              try {
                const res = await apiRequest("POST", "/api/admin/s3-upload-test");
                const json = await res.json();
                setS3UploadTest(json);
              } catch (err) {
                setS3UploadTest({
                  ok: false,
                  put: { ok: false, durationMs: 0 },
                  get: { ok: false, durationMs: 0 },
                  delete: { ok: false, durationMs: 0 },
                  key: "",
                  detail: String(err),
                });
              } finally {
                setS3UploadTestLoading(false);
              }
            }}
          >
            {s3UploadTestLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Загружаю...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Тест загрузки фото
              </>
            )}
          </Button>
          {s3UploadTest && (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${s3UploadTest.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}`}
              >
                {s3UploadTest.ok ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Загрузка работает
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Загрузка не работает
                  </>
                )}
              </div>
              {s3UploadTest.detail && <p className="text-xs text-destructive font-mono">{s3UploadTest.detail}</p>}
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { key: "put" as const, label: "PutObject (upload)" },
                  { key: "get" as const, label: "GetObject (download)" },
                  { key: "delete" as const, label: "DeleteObject" },
                ].map(({ key, label }) => {
                  const step = s3UploadTest[key];
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 ${step.ok ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : "border-destructive bg-destructive/10"}`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {step.ok ? (
                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive" />
                        )}
                        {label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {step.durationMs}ms{"sizeBytes" in step && step.sizeBytes ? ` · ${step.sizeBytes}b` : ""}
                      </div>
                      {"detail" in step && step.detail && (
                        <div className="text-xs text-destructive break-all mt-0.5">{step.detail}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">key: {s3UploadTest.key}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UX-S3-1: Bucket Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            S3 статистика бакета
          </CardTitle>
          <CardDescription>
            Кол-во объектов и объём по пользователям. Парсит ключи <code>photos/&#123;userId&#125;/...</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            disabled={s3StatsLoading}
            onClick={async () => {
              setS3StatsLoading(true);
              setS3Stats(null);
              try {
                const res = await apiRequest("GET", "/api/admin/s3-stats");
                const json = await res.json();
                setS3Stats(json);
              } catch {
                // ignore
              } finally {
                setS3StatsLoading(false);
              }
            }}
          >
            {s3StatsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4 mr-2" />
                Получить статистику
              </>
            )}
          </Button>
          {s3Stats && (
            <div className="space-y-3">
              <div className="flex gap-6 text-sm">
                <span>
                  Всего объектов: <b>{s3Stats.totalObjects}</b>
                </span>
                <span>
                  Размер: <b>{(s3Stats.totalBytes / 1024 / 1024).toFixed(2)} МБ</b>
                </span>
                {s3Stats.truncated && (
                  <span className="text-amber-600 dark:text-amber-400">⚠ показано первые 10 000</span>
                )}
              </div>
              {s3Stats.byUser.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead className="text-right">Файлов</TableHead>
                        <TableHead className="text-right">Размер</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s3Stats.byUser.map((row) => (
                        <TableRow key={row.userId ?? "other"}>
                          <TableCell className="text-xs">{row.userId ?? "—"}</TableCell>
                          <TableCell className="text-xs">{row.username}</TableCell>
                          <TableCell className="text-xs text-right">{row.count}</TableCell>
                          <TableCell className="text-xs text-right">{(row.totalBytes / 1024).toFixed(1)} КБ</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
