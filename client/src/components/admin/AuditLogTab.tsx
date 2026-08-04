import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollText, Download } from "lucide-react";
import { formatDateTime, getMskDateForFilename } from "./adminUtils";
import type { AuditLogEntry } from "./types";

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

export function AuditLogTab() {
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
