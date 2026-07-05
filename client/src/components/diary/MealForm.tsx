// MealForm.tsx — add/edit meal form. Wraps the meal fields in a Dialog on
// desktop, and delegates to the mobile bottom sheet (MealEditSheet) when
// editing on mobile. Owns all form state, handlers (handleSubmit /
// handleAnalyze), and mutations. Extracted verbatim from DiaryPage.tsx
// (29.4 refactor).
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calculator, Flame, BookOpen, Camera } from "lucide-react";
import { FoodCatalogModal } from "@/components/FoodCatalogModal";
import { MealEditSheet } from "@/components/MealEditSheet";
import type { Meal } from "@shared/schema";
import {
  MEAL_TYPES,
  hungerLabel,
  hungerColor,
  mskToday,
  defaultForm,
  formFromMeal,
  type AddMealFormData,
  type NutritionResult,
} from "@/lib/diary-utils";

interface MealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  defaultDate?: string; // UX-14: дата выбранного дня как дефолт для нового приёма
  editingMeal: Meal | null;
  onSaved: () => void;
}

// UX-19.2: show existing photos attached to a meal in edit mode, with delete
function ExistingPhotosEdit({ mealId }: { mealId: number }) {
  const { data } = useQuery<{ photos: { id: string }[] }>({
    queryKey: [`/api/meals/${mealId}/photos`],
  });
  const photos = data?.photos ?? [];
  const { toast } = useToast();
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const r = await apiRequest("DELETE", `/api/photos/${photoId}`);
      if (!r.ok) throw new Error("Ошибка удаления");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${mealId}/photos`] });
      toast({ title: "Фото удалено" });
    },
  });
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {photos.map((p) => (
        <div key={p.id} className="relative">
          <img src={`/api/photos/${p.id}`} alt="Фото" className="w-16 h-16 object-cover rounded-md border" />
          <button
            type="button"
            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center"
            onClick={() => deletePhotoMutation.mutate(p.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function MealForm({ open, onOpenChange, date, defaultDate, editingMeal, onSaved }: MealFormProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isEditingMeal = editingMeal !== null;

  const [form, setForm] = useState<AddMealFormData>(() =>
    editingMeal ? formFromMeal(editingMeal, date) : defaultForm(defaultDate),
  );
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  // Phase 26.7: idempotency key — сгенерирован один раз при монтировании формы,
  // чтобы повторная отправка (двойной клик / повтор сети) не создавала дубликат.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // UX-17: pending photos before meal is saved (up to 5)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPhotoPreviews, setPendingPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // КБЖУ analysis state
  const [kbjuResult, setKbjuResult] = useState<NutritionResult | null>(null);
  const [kbjuLoading, setKbjuLoading] = useState(false);
  const [deepseekAvailable, setDeepseekAvailable] = useState(false);

  // Re-sync form whenever the dialog is (re)opened for a different meal/date
  useEffect(() => {
    if (open) {
      setForm(editingMeal ? formFromMeal(editingMeal, date) : defaultForm(defaultDate));
      setKbjuResult(null);
      setPendingPhotos([]);
      setPendingPhotoPreviews([]);
      // Phase 26.7: новый ключ идемпотентности на каждое открытие формы для нового приёма
      if (!editingMeal) idempotencyKeyRef.current = crypto.randomUUID();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingMeal]);

  // Check if DeepSeek is available
  useEffect(() => {
    apiRequest("GET", "/api/analyze/available")
      .then((r) => r.json())
      .then((d) => setDeepseekAvailable(!!d.available))
      .catch(() => setDeepseekAvailable(false));
  }, []);

  // Reset КБЖУ when form food/drink changes
  useEffect(() => {
    setKbjuResult(null);
  }, [form.foodText, form.drinkText]);

  // ── КБЖУ analysis ──────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!form.foodText && !form.drinkText) {
      toast({ title: "Укажите еду или напитки", variant: "destructive" });
      return;
    }
    setKbjuLoading(true);
    setKbjuResult(null);
    try {
      const res = await apiRequest("POST", "/api/analyze", {
        foodText: form.foodText,
        drinkText: form.drinkText,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Ошибка анализа");
      }
      const data: NutritionResult = await res.json();
      setKbjuResult(data);
    } catch (e: any) {
      toast({ title: "Ошибка расчёта КБЖУ", description: e.message, variant: "destructive" });
    } finally {
      setKbjuLoading(false);
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addMealMutation = useMutation({
    mutationFn: async (data: AddMealFormData) => {
      const payload: Record<string, unknown> = {
        ...data,
      };
      if (kbjuResult) {
        payload.calories = kbjuResult.calories;
        payload.protein = kbjuResult.protein;
        payload.fat = kbjuResult.fat;
        payload.carbs = kbjuResult.carbs;
      }
      const res = await apiRequest("POST", "/api/meals", payload, {
        "Idempotency-Key": idempotencyKeyRef.current,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async (_result, variables) => {
      // UX-17: upload all pending photos after meal is created
      if (pendingPhotos.length > 0 && _result?.id) {
        try {
          await Promise.all(
            pendingPhotos.map(async (photo) => {
              const fd = new FormData();
              fd.append("photo", photo);
              fd.append("mealId", String(_result.id));
              await fetch("/api/photos/upload", { method: "POST", body: fd });
            }),
          );
        } catch {
          // фото не критично — не отменяем сохранение приёма
        }
      }
      queryClient.invalidateQueries({ queryKey: [`/api/days/${variables.date}`] });
      if (variables.date !== date) {
        queryClient.invalidateQueries({ queryKey: [`/api/days/${date}`] });
      }
      handleClose();
      toast({ title: pendingPhotos.length > 0 ? "Приём добавлен с фото" : "Приём добавлен" });
      setPendingPhotos([]);
      setPendingPhotoPreviews([]);
      onSaved();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data, originalDate }: { id: number; data: AddMealFormData; originalDate: string }) => {
      const payload: Record<string, unknown> = {
        tsStart: data.tsStart,
        tsEnd: data.tsEnd,
        mealType: data.mealType,
        foodText: data.foodText,
        drinkText: data.drinkText,
        waterUnits: data.waterUnits,
        hungerBefore: data.hungerBefore,
        satietyAfter: data.satietyAfter,
        contextNote: data.contextNote,
        date: data.date,
      };
      if (kbjuResult) {
        payload.calories = kbjuResult.calories;
        payload.protein = kbjuResult.protein;
        payload.fat = kbjuResult.fat;
        payload.carbs = kbjuResult.carbs;
      }
      const res = await apiRequest("PATCH", `/api/meals/${id}`, payload);
      if (!res.ok) throw new Error(await res.text());
      return { ...((await res.json()) as { meal: Meal }), originalDate };
    },
    onSuccess: ({ originalDate }) => {
      const targetDate = form.date;
      queryClient.invalidateQueries({ queryKey: [`/api/days/${targetDate}`] });
      if (originalDate !== targetDate) {
        queryClient.invalidateQueries({ queryKey: [`/api/days/${originalDate}`] });
      }
      handleClose();
      toast({
        title: originalDate !== targetDate ? "Приём перенесён" : "Приём обновлён",
        description: originalDate !== targetDate ? `Запись перемещена с ${originalDate} на ${targetDate}` : undefined,
      });
      onSaved();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  function handleClose() {
    setKbjuResult(null);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (isEditingMeal && editingMeal) {
      updateMealMutation.mutate({ id: editingMeal.id, data: form, originalDate: date });
    } else {
      addMealMutation.mutate(form);
    }
  }

  // UX-10: на мобиле редактирование открывается в bottom sheet
  if (isEditingMeal && isMobile) {
    return (
      <MealEditSheet
        open={open}
        onClose={handleClose}
        onSave={handleSubmit}
        isSaving={updateMealMutation.isPending}
        form={form}
        setForm={setForm}
        todayDate={mskToday()}
        hungerLabel={hungerLabel}
        hungerColor={hungerColor}
        deepseekAvailable={deepseekAvailable}
        kbjuResult={kbjuResult}
        kbjuLoading={kbjuLoading}
        onAnalyzeKbju={handleAnalyze}
        editingOriginalDate={date}
      />
    );
  }

  if (!open) return null;

  return (
    <>
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">
            {isEditingMeal ? "Редактирование приёма пищи" : "Новый приём пищи"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Date field */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="mealDate">
              Дата записи
              {isEditingMeal && form.date !== date && (
                <span className="ml-2 text-amber-600 font-normal">— запись будет перенесена в другой день</span>
              )}
              {form.date !== mskToday() && <span className="ml-2 text-amber-600 font-normal">— прошедший день</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="mealDate"
                type="date"
                value={form.date}
                max={mskToday()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-auto"
                data-testid="input-meal-date"
              />
              {form.date !== mskToday() && (
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => setForm((f) => ({ ...f, date: mskToday() }))}
                >
                  сегодня
                </button>
              )}
            </div>
          </div>

          {/* Time + type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="tsStart">
                Время начала
              </Label>
              <Input
                id="tsStart"
                type="time"
                value={form.tsStart}
                onChange={(e) => setForm((f) => ({ ...f, tsStart: e.target.value }))}
                data-testid="input-ts-start"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="tsEnd">
                Время окончания
              </Label>
              <Input
                id="tsEnd"
                type="time"
                value={form.tsEnd}
                onChange={(e) => setForm((f) => ({ ...f, tsEnd: e.target.value }))}
                data-testid="input-ts-end"
              />
            </div>
          </div>

          {!isEditingMeal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => setCatalogModalOpen(true)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Из каталога
            </Button>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Тип приёма</Label>
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mealType: t }))}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                    form.mealType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                  data-testid={`btn-meal-type-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs" htmlFor="foodText">
              Что ел
            </Label>
            <Textarea
              id="foodText"
              rows={2}
              placeholder="Опишите еду..."
              value={form.foodText}
              onChange={(e) => setForm((f) => ({ ...f, foodText: e.target.value }))}
              data-testid="input-food-text"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="drinkText">
                Что пил
              </Label>
              <Input
                id="drinkText"
                placeholder="Кофе, вода..."
                value={form.drinkText}
                onChange={(e) => setForm((f) => ({ ...f, drinkText: e.target.value }))}
                data-testid="input-drink-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="waterUnits">
                Кол-во вод (1 = 0.5 л)
              </Label>
              <Input
                id="waterUnits"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={form.waterUnits}
                onChange={(e) => setForm((f) => ({ ...f, waterUnits: e.target.value }))}
                data-testid="input-water-units"
              />
            </div>
          </div>

          {/* КБЖУ analysis button */}
          {deepseekAvailable && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                onClick={handleAnalyze}
                disabled={kbjuLoading || (!form.foodText && !form.drinkText)}
                data-testid="btn-analyze-kbju"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {kbjuLoading ? "Считаю КБЖУ..." : "Рассчитать КБЖУ"}
              </Button>

              {kbjuResult && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-orange-800 dark:text-orange-300">
                    <Flame className="h-4 w-4" />
                    {Math.round(kbjuResult.calories)} ккал
                  </div>
                  <div className="flex gap-3 text-xs text-orange-700 dark:text-orange-400">
                    <span>
                      Белки: <b>{kbjuResult.protein.toFixed(1)} г</b>
                    </span>
                    <span>
                      Жиры: <b>{kbjuResult.fat.toFixed(1)} г</b>
                    </span>
                    <span>
                      Углеводы: <b>{kbjuResult.carbs.toFixed(1)} г</b>
                    </span>
                  </div>
                  {kbjuResult.note && <p className="text-xs text-muted-foreground italic">{kbjuResult.note}</p>}
                  <p className="text-xs text-muted-foreground">Будет сохранено вместе с записью</p>
                </div>
              )}
            </div>
          )}

          {/* Hunger slider */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Голод ДО приёма:{" "}
              <span className={`font-semibold ${hungerColor(form.hungerBefore)}`}>{form.hungerBefore}</span>
              <span className="ml-1 text-muted-foreground font-normal text-xs">
                ({hungerLabel(form.hungerBefore).replace(/^\d+ — /, "")})
              </span>
            </Label>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[form.hungerBefore]}
              onValueChange={([v]) => setForm((f) => ({ ...f, hungerBefore: v }))}
              data-testid="slider-hunger"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 голод</span>
              <span>5 нейтрально</span>
              <span>10 объелся</span>
            </div>
          </div>

          {/* Satiety slider */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Насыщение ПОСЛЕ:{" "}
              <span className={`font-semibold ${hungerColor(form.satietyAfter)}`}>{form.satietyAfter}</span>
              <span className="ml-1 text-muted-foreground font-normal text-xs">
                ({hungerLabel(form.satietyAfter).replace(/^\d+ — /, "")})
              </span>
            </Label>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[form.satietyAfter]}
              onValueChange={([v]) => setForm((f) => ({ ...f, satietyAfter: v }))}
              data-testid="slider-satiety"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 голод</span>
              <span>5 нейтрально</span>
              <span>10 объелся</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs" htmlFor="contextNote">
              Контекст приёма <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input
              id="contextNote"
              placeholder="Например: ел за компьютером, в спешке..."
              value={form.contextNote}
              onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))}
              data-testid="input-context-note"
            />
          </div>

          {/* UX-17: multi-photo — up to 5 photos, new-meal form only */}
          {!isEditingMeal && (
            <div className="space-y-2">
              <Label className="text-xs">
                Фото приёма <span className="text-muted-foreground">(необязательно, до 5)</span>
              </Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  <Camera className="h-4 w-4" />
                  <span>Добавить фото</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      const remaining = 5 - pendingPhotos.length;
                      const toAdd = files.slice(0, remaining);
                      toAdd.forEach((file) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = (ev) =>
                          setPendingPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
                      });
                      setPendingPhotos((prev) => [...prev, ...toAdd]);
                      if (photoInputRef.current) photoInputRef.current.value = "";
                    }}
                    disabled={pendingPhotos.length >= 5}
                  />
                </label>
                {pendingPhotos.length > 0 && (
                  <span className="text-xs text-muted-foreground">{pendingPhotos.length}/5</span>
                )}
              </div>
              {pendingPhotoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingPhotoPreviews.map((preview, i) => (
                    <div key={i} className="relative">
                      <img src={preview} alt={`Фото ${i + 1}`} className="w-16 h-16 object-cover rounded-md border" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center leading-none"
                        onClick={() => {
                          setPendingPhotos((prev) => prev.filter((_, j) => j !== i));
                          setPendingPhotoPreviews((prev) => prev.filter((_, j) => j !== i));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UX-19.2: show existing photos in edit mode */}
          {editingMeal && <ExistingPhotosEdit mealId={editingMeal.id} />}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              className="w-full sm:flex-1 h-11"
              onClick={handleSubmit}
              disabled={addMealMutation.isPending || updateMealMutation.isPending || !form.tsStart || !form.date}
              data-testid="btn-save-meal"
            >
              {addMealMutation.isPending || updateMealMutation.isPending
                ? "Сохраняю..."
                : isEditingMeal
                  ? "Сохранить изменения"
                  : "Сохранить"}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11"
              onClick={handleClose}
              data-testid="btn-cancel-meal"
            >
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>

      <FoodCatalogModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        onSelect={(item) => {
          const totalKcal = item.entries.reduce((s: number, e: any) => s + (e.kcal ?? 0), 0);
          const totalProtein = item.entries.reduce((s: number, e: any) => s + (e.protein ?? 0), 0);
          const totalFat = item.entries.reduce((s: number, e: any) => s + (e.fat ?? 0), 0);
          const totalCarbs = item.entries.reduce((s: number, e: any) => s + (e.carbs ?? 0), 0);
          const foodText = item.entries.map((e: any) => e.mealName).join(", ") || item.name;
          setForm((f) => ({
            ...f,
            foodText,
            calories: totalKcal || undefined,
            protein: totalProtein || undefined,
            fat: totalFat || undefined,
            carbs: totalCarbs || undefined,
          }));
        }}
      />
    </>
  );
}
