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
import { LogOut, Shield, ArrowLeft, Ban } from "lucide-react";

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
  const { data, isLoading, error } = useQuery<{ sessions: AdminSession[] }>({
    queryKey: ["/api/admin/sessions"],
  });

  const sessions = data?.sessions ?? [];
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

      <main className="max-w-5xl mx-auto px-4 py-4">
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
