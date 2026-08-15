// DiaryDialogs.tsx — small standalone dialogs used by DiaryPage: delete-meal
// confirmation and the multi-day report range picker (Phase 21). Extracted to
// keep DiaryPage.tsx within the line budget (29.4 refactor).
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DeleteMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteMealDialog({ open, onOpenChange, onConfirm, isDeleting }: DeleteMealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Удалить запись?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} data-testid="btn-confirm-delete">
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReportRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onDownload: () => void;
  reportFormat: "pdf" | "xlsx";
  onChangeReportFormat: (f: "pdf" | "xlsx") => void;
}

export function ReportRangeDialog({
  open,
  onOpenChange,
  from,
  to,
  onFromChange,
  onToChange,
  onDownload,
  reportFormat,
  onChangeReportFormat,
}: ReportRangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Отчёт за период</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">С</Label>
            <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">По</Label>
            <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Формат</Label>
          <ToggleGroup
            type="single"
            value={reportFormat}
            onValueChange={(v) => v && onChangeReportFormat(v as "pdf" | "xlsx")}
            size="sm"
            variant="outline"
            className="justify-start"
          >
            <ToggleGroupItem value="pdf" aria-label="PDF" data-testid="dialog-toggle-format-pdf">
              PDF
            </ToggleGroupItem>
            <ToggleGroupItem value="xlsx" aria-label="Excel" data-testid="dialog-toggle-format-xlsx">
              Excel
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onDownload();
            }}
          >
            Скачать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
