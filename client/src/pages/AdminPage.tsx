import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Shield, ArrowLeft, Ban, KeyRound } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
}

interface AdminSession {
  id: number;
  userId: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
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

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [resetResult, setResetResult] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
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
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.displayName || user?.username}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
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
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((adminUser) => (
                    <TableRow key={adminUser.id}>
                      <TableCell>
                        <div className="font-medium">{adminUser.displayName || adminUser.username}</div>
                        <div className="text-xs text-muted-foreground">{adminUser.email}</div>
                      </TableCell>
                      <TableCell>{adminUser.role}</TableCell>
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
              Список действующих refresh sessions. Администратор может отозвать одну сессию или все сессии пользователя.
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
                    <TableHead>Пользователь</TableHead>
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
                        <div className="font-medium">{session.displayName || session.username}</div>
                        <div className="text-xs text-muted-foreground">{session.email}</div>
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
      </main>
    </div>
  );
}
