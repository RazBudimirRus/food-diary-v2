/**
 * ProfileQuestionnaire — анкета пользователя (Фаза 17).
 * - Показывается автоматически при первом входе если профиль пуст
 * - Открывается вручную через кнопку «Моя анкета»
 * - Загружает существующие данные при открытии
 * - Автоматически рассчитывает КБЖУ-ориентиры по формуле Миффлина-Сан Жеор
 */
import { useState, useEffect } from "react";
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

// ── Коэффициенты активности ───────────────────────────────────────────────────
const ACTIVITY_COEFF: Record<string, number> = {
  minimal: 1.2, // сидячий образ жизни
  medium: 1.55, // 1–3 тренировки в неделю
  high: 1.725, // 4+ тренировок в неделю
};

/**
 * Формула Миффлина-Сан Жеор → ОО → TDEE
 * Возвращает { kcal, protein, fat, carbs } или null если данных недостаточно
 */
function calcKbzhu(
  gender: string,
  heightCm: number,
  weightKg: number,
  activity: string,
): { kcal: number; protein: number; fat: number; carbs: number } | null {
  if (!heightCm || !weightKg || gender === "unspecified") return null;

  // BMR (базальный обмен) — возраст неизвестен, берём 30 лет как нейтральное
  const age = 30;
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const tdee = Math.round(bmr * (ACTIVITY_COEFF[activity] ?? 1.55));

  // Стандартное распределение БЖУ: Б 25% / Ж 30% / У 45%
  const protein = Math.round((tdee * 0.25) / 4); // 4 ккал/г
  const fat = Math.round((tdee * 0.3) / 9); // 9 ккал/г
  const carbs = Math.round((tdee * 0.45) / 4); // 4 ккал/г

  return { kcal: tdee, protein, fat, carbs };
}

export function ProfileQuestionnaire({ open, onClose }: ProfileQuestionnaireProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const [gender, setGender] = useState<"male" | "female" | "unspecified">("unspecified");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<"minimal" | "medium" | "high">("medium");
  const [targetKcal, setTargetKcal] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);

  // Загружаем существующий профиль при каждом открытии
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiRequest("GET", "/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        const p = data?.profile;
        if (!p) return;
        setGender(p.gender ?? "unspecified");
        setHeight(p.heightCm != null ? String(p.heightCm) : "");
        setWeight(p.weightKg != null ? String(p.weightKg) : "");
        setActivity(p.activityLevel ?? "medium");
        setTargetKcal(p.targetKcal != null ? String(p.targetKcal) : "");
        setTargetProtein(p.targetProtein != null ? String(p.targetProtein) : "");
        setTargetFat(p.targetFat != null ? String(p.targetFat) : "");
        setTargetCarbs(p.targetCarbs != null ? String(p.targetCarbs) : "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Автопересчёт КБЖУ при изменении пола/роста/веса/активности
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return;
    const result = calcKbzhu(gender, h, w, activity);
    if (!result) return;
    setTargetKcal(String(result.kcal));
    setTargetProtein(String(result.protein));
    setTargetFat(String(result.fat));
    setTargetCarbs(String(result.carbs));
  }, [gender, height, weight, activity]);

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

  // Показать расчёт пользователю
  const calcPreview = (() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || gender === "unspecified") return null;
    return calcKbzhu(gender, h, w, activity);
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleSkip();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Моя анкета</DialogTitle>
          <DialogDescription>
            Укажите параметры — КБЖУ рассчитаются автоматически по формуле Миффлина-Сан Жеор. Все поля необязательны.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : (
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

            {/* Подсказка с расчётом */}
            {calcPreview && (
              <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Расчёт по формуле:</span> {calcPreview.kcal} ккал · Б{" "}
                {calcPreview.protein} г · Ж {calcPreview.fat} г · У {calcPreview.carbs} г
                <span className="block mt-0.5 opacity-70">Можно скорректировать вручную ниже</span>
              </div>
            )}

            {/* Целевые КБЖУ */}
            <div>
              <Label className="text-xs mb-2 block">Целевые КБЖУ (автозаполнение или вручную)</Label>
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
        )}

        {/* Phase 20 — Ограничения питания */}
        <div className="space-y-2">
          <Label className="text-xs font-medium block">Ограничения питания</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["lactose", "Лактоза"],
              ["gluten", "Глютен"],
              ["nuts", "Орехи"],
              ["vegetarian", "Вегетарианство"],
              ["vegan", "Веганство"],
              ["diabetes", "Диабет"],
              ["gout", "Подагра"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer hover:bg-accent transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded"
                  checked={dietaryRestrictions.includes(key)}
                  onChange={(e) => {
                    setDietaryRestrictions((prev) =>
                      e.target.checked ? [...prev, key] : prev.filter((r) => r !== key),
                    );
                  }}
                />
                <span className="text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={handleSkip} disabled={pending || loading} className="flex-1">
            Пропустить
          </Button>
          <Button onClick={handleSave} disabled={pending || loading} className="flex-1">
            {pending ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
