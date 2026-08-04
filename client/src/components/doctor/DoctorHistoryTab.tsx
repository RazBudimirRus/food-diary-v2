import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatHistoryDate } from "./doctorUtils";
import type { AuditLogEntry } from "./types";

export function DoctorHistoryTab() {
  const { data: historyData, isLoading: historyLoading } = useQuery<{ entries: AuditLogEntry[] }>({
    queryKey: ["/api/doctor/audit-log"],
  });
  const historyEntries = historyData?.entries ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium flex items-center gap-2">
        <History className="h-4 w-4" /> Мои последние действия
      </p>
      {historyLoading && <p className="text-sm text-muted-foreground text-center py-6">Загрузка...</p>}
      {!historyLoading && historyEntries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Действий пока нет</p>
      )}
      {!historyLoading && historyEntries.length > 0 && (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Цель</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatHistoryDate(entry.createdAt)}</TableCell>
                    <TableCell className="text-xs">{entry.action}</TableCell>
                    <TableCell className="text-xs">{entry.targetId != null ? `#${entry.targetId}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
