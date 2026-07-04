// DayCommentBox.tsx — day comment/summary editor (голод, сытость, вода, сон,
// комментарий): the "+ Добавить итоги дня" trigger plus the "Итоги дня" Dialog
// with wake/sleep time+date, sport activity, steps, and day comment fields.
// Extracted verbatim from DiaryPage.tsx (29.4 refactor).
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sun, Moon, Activity, Footprints } from "lucide-react";
import type { Day } from "@shared/schema";
import { addDays, inferSleepDate } from "@shared/dates";
import { formatDate, mskToday } from "@/lib/diary-utils";

interface DayCommentBoxProps {
  day: Day | null | undefined;
  date: string;
  onSaved: () => void;
}

export function DayCommentBox({ day, date, onSaved }: DayCommentBoxProps) {
  const { toast } = useToast();
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryForm, setSummaryForm] = useState({
    wakeTime: "",
    sleepTime: "",
    wakeDate: "",
    sleepDate: "",
    sportActivity: "",
    steps: "",
    dayComment: "",
  });

  // Keep summary form in sync when day loads (pre-fill)
  useEffect(() => {
    if (day) {
      setSummaryForm({
        wakeTime: day.wakeTime ?? "",
        sleepTime: day.sleepTime ?? "",
        wakeDate: day.wakeDate ?? date,
        sleepDate: day.sleepDate ?? inferSleepDate(date, day.sleepTime) ?? date,
        sportActivity: day.sportActivity ?? "",
        steps: day.steps != null ? String(day.steps) : "",
        dayComment: day.dayComment ?? "",
      });
    }
  }, [day, date]);

  const saveSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!day) throw new Error("Day not loaded");
      const res = await apiRequest("POST", `/api/days/${day.id}/summary`, {
        ...summaryForm,
        steps: summaryForm.steps ? Number(summaryForm.steps) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${date}`] });
      setShowSummaryDialog(false);
      toast({ title: "Итоги дня сохранены" });
      onSaved();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!day) return null;

  return (
    <>
      {!day.summaryFilled && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => setShowSummaryDialog(true)}
          data-testid="btn-add-summary"
        >
          + Добавить итоги дня (подъём, спорт, шаги)
        </button>
      )}
      {day.summaryFilled && (
        <button className="text-primary underline text-xs" onClick={() => setShowSummaryDialog(true)}>
          изменить
        </button>
      )}

      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Итоги дня — {formatDate(date)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Sun className="h-3 w-3" /> Подъём
                </Label>
                <Input
                  type="date"
                  value={summaryForm.wakeDate}
                  max={mskToday()}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, wakeDate: e.target.value }))}
                  data-testid="input-wake-date"
                  className="mb-1"
                />
                <Input
                  type="time"
                  value={summaryForm.wakeTime}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, wakeTime: e.target.value }))}
                  data-testid="input-wake-time"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Moon className="h-3 w-3" /> Отбой
                </Label>
                <Input
                  type="date"
                  value={summaryForm.sleepDate}
                  max={addDays(date, 1)}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, sleepDate: e.target.value }))}
                  data-testid="input-sleep-date"
                  className="mb-1"
                />
                <Input
                  type="time"
                  value={summaryForm.sleepTime}
                  onChange={(e) => {
                    const sleepTime = e.target.value;
                    setSummaryForm((f) => ({
                      ...f,
                      sleepTime,
                      sleepDate: inferSleepDate(date, sleepTime) ?? f.sleepDate,
                    }));
                  }}
                  data-testid="input-sleep-time"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Activity className="h-3 w-3" /> Спорт / активность
              </Label>
              <Input
                placeholder='Например: йога 30 мин, или "нет"'
                value={summaryForm.sportActivity}
                onChange={(e) => setSummaryForm((f) => ({ ...f, sportActivity: e.target.value }))}
                data-testid="input-sport"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Footprints className="h-3 w-3" /> Шаги за день
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={summaryForm.steps}
                onChange={(e) => setSummaryForm((f) => ({ ...f, steps: e.target.value }))}
                data-testid="input-steps"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Комментарий дня <span className="text-muted-foreground">(самочувствие, контекст)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Как прошёл день, настроение, самочувствие..."
                value={summaryForm.dayComment}
                onChange={(e) => setSummaryForm((f) => ({ ...f, dayComment: e.target.value }))}
                data-testid="input-day-comment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => saveSummaryMutation.mutate()}
              disabled={saveSummaryMutation.isPending}
              data-testid="btn-save-summary"
            >
              {saveSummaryMutation.isPending ? "Сохраняю..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
