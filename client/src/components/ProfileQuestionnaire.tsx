/**
 * ProfileQuestionnaire — онбординг-модал для анкеты пользователя (Фаза 17).
 * Показывается при первом входе, если анкета не заполнена.
 * Пользователь может пропустить.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProfileQuestionnaireProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileQuestionnaire({ open, onClose }: ProfileQuestionnaireProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const [gender, setGender] = useState<"male" | "female" | "unspecified">("unspecified");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<"minimal" | "medium" | "high">("medium");
  const [targetKcal, setTargetKcal] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");

  async function handleSave() {
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        gender,
        activityLevel: activity,
        onboardingSkipped: false,
      };
      if (height) body.heightCm = Number(height);
      if (weight) body.weightKg = Number(weight);
      if (targetKcal) body.targetKcal = Number(targetKcal);
      if (targetProtein) body.targetProtein = Number(targetProtein);
      if (targetFat) body.targetFat = Number(targetFat);
      if (targetCarbs) body.targetCarbs = Number(targetCarbs);

      const res = await apiRequest("PUT", "/api/user/profile", body);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить анкету");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Анкета сохранена" });
      onClose();
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  async function handleSkip() {
    setPending(true);
    try {
      await apiRequest("PUT", "/api/user/profile", { onboardingSkipped: true });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      onClose();
    } catch {
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleSkip();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Расскажите о себе</DialogTitle>
          <DialogDescription>Эти данные помогут рассчитать нормы КБЖУ. Все поля необязательны.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Пол */}
          <div className="space-y-1">
            <Label className="text-xs">Пол</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мужской</SelectItem>
                <SelectItem value="female">Женский</SelectItem>
                <SelectItem value="unspecified">Не указывать</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Рост / вес */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Рост, см</Label>
              <Input
                type="number"
                min={100}
                max={250}
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Вес, кг</Label>
              <Input
                type="number"
                min={30}
                max={300}
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {/* Активность */}
          <div className="space-y-1">
            <Label className="text-xs">Уровень активности</Label>
            <Select value={activity} onValueChange={(v) => setActivity(v as typeof activity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Минимальная (сидячая работа)</SelectItem>
                <SelectItem value="medium">Средняя (1–3 тренировки в неделю)</SelectItem>
                <SelectItem value="high">Высокая (4+ тренировок в неделю)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Целевые КБЖУ */}
          <div>
            <Label className="text-xs mb-2 block">Целевые КБЖУ (необязательно)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ккал</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="2000"
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Белки, г</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="120"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Жиры, г</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="70"
                  value={targetFat}
                  onChange={(e) => setTargetFat(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Углеводы, г</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="200"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={handleSkip} disabled={pending} className="flex-1">
            Пропустить
          </Button>
          <Button onClick={handleSave} disabled={pending} className="flex-1">
            {pending ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
