import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { ClientError } from "./types";

export function ClientErrorsTab() {
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
