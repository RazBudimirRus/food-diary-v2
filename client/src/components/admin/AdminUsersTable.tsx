import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { KeyRound } from "lucide-react";
import { AdminUserCell } from "./AdminUserCell";
import type { AdminUser } from "./types";

export function AdminUsersTable() {
  const [resetResult, setResetResult] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const users = usersData?.users ?? [];

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

  function resetUserPassword(userId: number, username: string) {
    if (!window.confirm(`Сбросить пароль пользователя ${username}? Его refresh-сессии будут отозваны.`)) return;
    resetPasswordMutation.mutate(userId);
  }

  return (
    <>
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
    </>
  );
}
