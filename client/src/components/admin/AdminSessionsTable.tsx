import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Ban } from "lucide-react";
import { AdminUserCell } from "./AdminUserCell";
import { formatDateTime } from "./adminUtils";
import type { AdminSession } from "./types";

export function AdminSessionsTable() {
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
  );
}
