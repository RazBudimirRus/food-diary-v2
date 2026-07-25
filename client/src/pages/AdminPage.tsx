import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LogOut,
  Shield,
  ArrowLeft,
  Ban,
  KeyRound,
  BarChart3,
  Users,
  ScrollText,
  Download,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "doctor" | "admin";
}

interface AdminSession {
  id: number;
  userId: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "doctor" | "admin";
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
}

interface DeepSeekUsageDay {
  date: string;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  requests: number;
}

interface S3TestStep {
  ok: boolean;
  durationMs: number;
  detail: string;
}

interface S3TestResult {
  ok: boolean;
  steps: {
    put: S3TestStep;
    get: S3TestStep;
    delete: S3TestStep;
  };
  error?: string;
}

interface DeepSeekUsageSummary {
  totalRequests: number;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  byDay: DeepSeekUsageDay[];
  dailyTokenLimit: number;
  todayTokens: number;
  dailyLimitExceeded: boolean;
  analysisBlocked: boolean;
}

interface AuditLogEntry {
  id: number;
  actorId: number;
  actorRole: "user" | "doctor" | "admin";
  action: string;
  targetId: number | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminUserCell({
  username,
  email,
  displayName,
}: {
  username: string;
  email: string;
  displayName: string | null;
}) {
  const showDisplayName = displayName && displayName !== username;
  return (
    <div>
      <div className="font-medium" data-testid={`admin-username-${username}`}>
        {username}
      </div>
      <div className="text-xs text-muted-foreground">{email}</div>
      {showDisplayName && <div className="text-xs text-muted-foreground">Имя: {displayName}</div>}
    </div>
  );
}

const AUDIT_ACTIONS = [
  "admin.view_user",
  "admin.set_role",
  "admin.reset_password",
  "admin.revoke_sessions",
  "doctor.view_diary",
  "doctor.assign_patient",
  "doctor.remove_patient",
  "doctor.create_plan",
  "doctor.delete_plan",
  "doctor.add_meal_note",
];

function exportAuditLogCsv(entries: AuditLogEntry[]) {
  const header = ["Дата", "Актор", "Роль", "Действие", "Цель", "IP", "Детали"];
  const rows = entries.map((entry) => [
    formatDateTime(entry.createdAt),
    String(entry.actorId),
    entry.actorRole,
    entry.action,
    entry.targetId != null ? String(entry.targetId) : "",
    entry.ip ?? "",
    entry.detail ?? "",
  ]);
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${getMskDateForFilename()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getMskDateForFilename() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Client Errors Tab ───────────────────────────────────────────────────────

interface ClientError {
  id: number;
  userId: number | null;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  extra: string | null;
  createdAt: string;
}

function ClientErrorsTab() {
  const { data, isLoading, error, refetch } = useQuery<{ errors: ClientError[] }>({
    queryKey: ["/api/client-errors/admin"],
    refetchInterval: 60_000, // авто-обновление раз в минуту
  });

  const errors = data?.errors ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Загрузка...</p>;
  if (error) return <p className="text-sm text-destructive p-4">Ошибка загрузки: {(error as Error).message}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Клиентские ошибки
        </CardTitle>
        <CardDescription>
          Ошибки браузера (window.onerror, ErrorBoundary) за последние 7 дней. Хранится не более 200 записей.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-3">
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Обновить
          </Button>
        </div>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Ошибок нет — всё чисто.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Время (МСК)</TableHead>
                  <TableHead className="w-12">User</TableHead>
                  <TableHead>Сообщение</TableHead>
                  <TableHead className="w-48">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {e.createdAt.replace("T", " ").slice(0, 19)}
                    </TableCell>
                    <TableCell className="text-xs">{e.userId ?? "—"}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium break-all">{e.message}</p>
                      {e.stack && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">stack trace</summary>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all mt-1 max-h-40 overflow-y-auto">
                            {e.stack}
                          </pre>
                        </details>
                      )}
                      {e.extra && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">extra</summary>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all mt-1">
                            {e.extra}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                    <TableCell className="text-xs break-all max-w-[180px]">{e.url ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (actionFilter) p.set("action", actionFilter);
    if (targetFilter.trim()) p.set("target", targetFilter.trim());
    if (fromFilter) p.set("from", new Date(fromFilter).toISOString());
    if (toFilter) p.set("to", new Date(toFilter).toISOString());
    p.set("limit", "200");
    return p.toString();
  }, [actionFilter, targetFilter, fromFilter, toFilter]);

  const { data, isLoading, error } = useQuery<{ entries: AuditLogEntry[] }>({
    queryKey: [`/api/admin/audit-log?${params}`],
  });

  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          Журнал действий
        </CardTitle>
        <CardDescription>Действия администраторов и врачей: кто, что и когда сделал в системе.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            className="text-xs rounded border border-input bg-background px-2 py-1.5
                       focus:outline-none focus:ring-1 focus:ring-ring"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            data-testid="select-audit-action"
          >
            <option value="">Все действия</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <Input
            placeholder="ID цели"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-audit-target"
          />
          <Input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-audit-from"
          />
          <Input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="h-8 text-xs"
            data-testid="input-audit-to"
          />
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportAuditLogCsv(entries)}
            disabled={entries.length === 0}
            data-testid="btn-export-audit-csv"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Экспорт CSV
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Загрузка журнала...</p>}
        {error && <p className="text-sm text-destructive">Не удалось загрузить журнал действий</p>}
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">Записей не найдено.</p>
        )}
        {!isLoading && !error && entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Актор</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Цель</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>#{entry.actorId}</TableCell>
                  <TableCell>{entry.actorRole}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.targetId != null ? `#${entry.targetId}` : "—"}</TableCell>
                  <TableCell>{entry.ip ?? "—"}</TableCell>
                  <TableCell>
                    {entry.detail ? (
                      <Accordion type="single" collapsible>
                        <AccordionItem value={String(entry.id)} className="border-none">
                          <AccordionTrigger className="py-0 text-xs">Показать</AccordionTrigger>
                          <AccordionContent>
                            <pre className="whitespace-pre-wrap break-all text-xs bg-muted/40 rounded p-2">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(entry.detail as string), null, 2);
                                } catch {
                                  return entry.detail;
                                }
                              })()}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type AdminTab = "users" | "audit" | "errors";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [tab, setTab] = useState<AdminTab>("users");
  const [resetResult, setResetResult] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [s3TestResult, setS3TestResult] = useState<S3TestResult | null>(null);
  const [s3TestLoading, setS3TestLoading] = useState(false);
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });
  const {
    data: deepseekUsage,
    isLoading: deepseekLoading,
    error: deepseekError,
  } = useQuery<DeepSeekUsageSummary>({
    queryKey: ["/api/admin/deepseek/usage"],
  });
  const { data, isLoading, error } = useQuery<{ sessions: AdminSession[] }>({
    queryKey: ["/api/admin/sessions"],
  });

  const users = usersData?.users ?? [];
  const sessions = data?.sessions ?? [];
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ user: AdminUser; temporaryPassword: string }>;
    },
    onSuccess: ({ user, temporaryPassword }) => {
      setResetResult({ username: user.username, temporaryPassword });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
    },
  });
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest("POST", `/api/admin/sessions/${sessionId}/revoke`);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
    },
  });
  const revokeUserSessionsMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/revoke-sessions`);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/set-role`, { role });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  function revokeAllUserSessions(userId: number, username: string) {
    if (!window.confirm(`Отозвать все refresh-сессии пользователя ${username}?`)) return;
    revokeUserSessionsMutation.mutate(userId);
  }

  function resetUserPassword(userId: number, username: string) {
    if (!window.confirm(`Сбросить пароль пользователя ${username}? Его refresh-сессии будут отозваны.`)) return;
    resetPasswordMutation.mutate(userId);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base">Админ-панель</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href="#/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Дневник
              </a>
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.username}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
        <div className="flex gap-2 border-b">
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "users"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("users")}
            data-testid="tab-admin-users"
          >
            <Users className="h-4 w-4" />
            Пользователи
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "audit"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("audit")}
            data-testid="tab-admin-audit"
          >
            <ScrollText className="h-4 w-4" />
            Журнал
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "errors"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("errors")}
            data-testid="tab-admin-errors"
          >
            <AlertTriangle className="h-4 w-4" />
            Ошибки
          </button>
        </div>

        {tab === "audit" && <AuditLogTab />}
        {tab === "errors" && <ClientErrorsTab />}

        {tab === "users" && (
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
                          {deepseekUsage.tokensIn.toLocaleString("ru-RU")} /{" "}
                          {deepseekUsage.tokensOut.toLocaleString("ru-RU")}
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

            {resetResult && (
              <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardHeader>
                  <CardTitle className="text-base">Временный пароль создан</CardTitle>
                  <CardDescription>
                    Покажите этот пароль пользователю один раз. После закрытия он не будет доступен в интерфейсе.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Пользователь: {resetResult.username}</div>
                    <code className="mt-1 block rounded bg-background px-3 py-2 text-sm font-semibold">
                      {resetResult.temporaryPassword}
                    </code>
                  </div>
                  <Button variant="outline" onClick={() => setResetResult(null)}>
                    Закрыть
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Пользователи</CardTitle>
                <CardDescription>
                  Сброс пароля создаёт временный пароль и отзывает refresh-сессии выбранного пользователя.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading && <p className="text-sm text-muted-foreground">Загрузка пользователей...</p>}
                {usersError && <p className="text-sm text-destructive">Не удалось загрузить пользователей</p>}
                {!usersLoading && !usersError && users.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Логин</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((adminUser) => (
                        <TableRow key={adminUser.id}>
                          <TableCell>
                            <AdminUserCell
                              username={adminUser.username}
                              email={adminUser.email}
                              displayName={adminUser.displayName}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              className="text-xs rounded border border-input bg-background px-2 py-1 cursor-pointer
                                     focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                              value={adminUser.role}
                              disabled={setRoleMutation.isPending}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                if (newRole !== adminUser.role) {
                                  setRoleMutation.mutate({ userId: adminUser.id, role: newRole });
                                }
                              }}
                            >
                              <option value="user">user</option>
                              <option value="doctor">doctor</option>
                              <option value="admin">admin</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetUserPassword(adminUser.id, adminUser.username)}
                              disabled={resetPasswordMutation.isPending}
                              data-testid={`btn-reset-password-${adminUser.id}`}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              Сбросить пароль
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Активные сессии</CardTitle>
                <CardDescription>
                  Список действующих refresh sessions. Администратор может отозвать одну сессию или все сессии
                  пользователя.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && <p className="text-sm text-muted-foreground">Загрузка сессий...</p>}
                {error && <p className="text-sm text-destructive">Не удалось загрузить сессии</p>}
                {!isLoading && !error && sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Активных сессий нет.</p>
                )}
                {!isLoading && !error && sessions.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Логин</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>User-Agent</TableHead>
                        <TableHead>Создана</TableHead>
                        <TableHead>Истекает</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <AdminUserCell
                              username={session.username}
                              email={session.email}
                              displayName={session.displayName}
                            />
                          </TableCell>
                          <TableCell>{session.role}</TableCell>
                          <TableCell>{session.ip ?? "—"}</TableCell>
                          <TableCell className="max-w-xs truncate" title={session.userAgent ?? undefined}>
                            {session.userAgent ?? "—"}
                          </TableCell>
                          <TableCell>{formatDateTime(session.createdAt)}</TableCell>
                          <TableCell>{formatDateTime(session.expiresAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeSessionMutation.mutate(session.id)}
                                disabled={revokeSessionMutation.isPending || revokeUserSessionsMutation.isPending}
                                data-testid={`btn-revoke-session-${session.id}`}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Сессию
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => revokeAllUserSessions(session.userId, session.username)}
                                disabled={revokeSessionMutation.isPending || revokeUserSessionsMutation.isPending}
                                data-testid={`btn-revoke-user-sessions-${session.userId}`}
                              >
                                Все
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
