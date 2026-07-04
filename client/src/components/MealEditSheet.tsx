// UX-10: Bottom sheet для редактирования приёма пищи на мобильных устройствах (< md / 768px).
// Переиспользует ту же форму и state, что и инлайн-редактирование на десктопе —
// логика (mutations, КБЖУ-анализ) остаётся в DiaryPage, компонент только рендерит UI.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, Flame } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

const MEAL_TYPES = ["завтрак", "обед", "перекус", "ужин"] as const;
type MealType = (typeof MEAL_TYPES)[number];

export interface MealEditFormData {
  date: string;
  tsStart: string;
  tsEnd: string;
  mealType: MealType;
  foodText: string;
  drinkText: string;
  waterUnits: string;
  hungerBefore: number;
  satietyAfter: number;
  contextNote: string;
}

export interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

interface MealEditSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  form: MealEditFormData;
  setForm: (updater: (f: MealEditFormData) => MealEditFormData) => void;
  todayDate: string;
  hungerLabel: (v: number) => string;
  hungerColor: (v: number) => string;
  deepseekAvailable: boolean;
  kbjuResult: NutritionResult | null;
  kbjuLoading: boolean;
  onAnalyzeKbju: () => void;
  editingOriginalDate: string | null;
}

/** Bottom sheet для редактирования приёма пищи (мобильная версия). */
export function MealEditSheet({
  open,
  onClose,
  onSave,
  isSaving,
  form,
  setForm,
  todayDate,
  hungerLabel,
  hungerColor,
  deepseekAvailable,
  kbjuResult,
  kbjuLoading,
  onAnalyzeKbju,
  editingOriginalDate,
}: MealEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] flex flex-col p-0 gap-0 rounded-t-xl"
        data-testid="sheet-edit-meal"
      >
        <SheetHeader className="px-4 pt-4 pb-2 text-left border-b">
          <SheetTitle>Редактирование приёма пищи</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Date field */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="sheetMealDate">
              Дата записи
              {editingOriginalDate && form.date !== editingOriginalDate && (
                <span className="ml-2 text-amber-600 font-normal">— запись будет перенесена в другой день</span>
              )}
              {form.date !== todayDate && <span className="ml-2 text-amber-600 font-normal">— прошедший день</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sheetMealDate"
                type="date"
                value={form.date}
                max={todayDate}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-auto"
                data-testid="input-sheet-meal-date"
              />
              {form.date !== todayDate && (
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => setForm((f) => ({ ...f, date: todayDate }))}
                >
                  сегодня
                </button>
              )}
            </div>
          </div>

          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="sheetTsStart">
                Время начала
              </Label>
              <Input
                id="sheetTsStart"
                type="time"
                value={form.tsStart}
                onChange={(e) => setForm((f) => ({ ...f, tsStart: e.target.value }))}
                data-testid="input-sheet-ts-start"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="sheetTsEnd">
                Время окончания
              </Label>
              <Input
                id="sheetTsEnd"
                type="time"
                value={form.tsEnd}
                onChange={(e) => setForm((f) => ({ ...f, tsEnd: e.target.value }))}
                data-testid="input-sheet-ts-end"
              />
            </div>
          </div>

          {/* Meal type */}
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
                  data-testid={`btn-sheet-meal-type-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Food items */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="sheetFoodText">
              Что ел
            </Label>
            <Textarea
              id="sheetFoodText"
              rows={2}
              placeholder="Опишите еду..."
              value={form.foodText}
              onChange={(e) => setForm((f) => ({ ...f, foodText: e.target.value }))}
              data-testid="input-sheet-food-text"
            />
          </div>

          {/* Drink items + water */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="sheetDrinkText">
                Что пил
              </Label>
              <Textarea
                id="sheetDrinkText"
                rows={2}
                placeholder="Кофе, вода..."
                value={form.drinkText}
                onChange={(e) => setForm((f) => ({ ...f, drinkText: e.target.value }))}
                data-testid="input-sheet-drink-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="sheetWaterUnits">
                Кол-во вод (1 = 0.5 л)
              </Label>
              <Input
                id="sheetWaterUnits"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={form.waterUnits}
                onChange={(e) => setForm((f) => ({ ...f, waterUnits: e.target.value }))}
                data-testid="input-sheet-water-units"
              />
            </div>
          </div>

          {/* КБЖУ analysis */}
          {deepseekAvailable && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                onClick={onAnalyzeKbju}
                disabled={kbjuLoading || (!form.foodText && !form.drinkText)}
                data-testid="btn-sheet-analyze-kbju"
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
                  <div className="flex gap-3 text-xs text-orange-700 dark:text-orange-400 flex-wrap">
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

          {/* Hunger before */}
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
              data-testid="slider-sheet-hunger"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 голод</span>
              <span>5 нейтрально</span>
              <span>10 объелся</span>
            </div>
          </div>

          {/* Satisfaction after */}
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
              data-testid="slider-sheet-satiety"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 голод</span>
              <span>5 нейтрально</span>
              <span>10 объелся</span>
            </div>
          </div>

          {/* Context / comment */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="sheetContextNote">
              Контекст приёма <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Textarea
              id="sheetContextNote"
              rows={2}
              placeholder="Например: ел за компьютером, в спешке..."
              value={form.contextNote}
              onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))}
              data-testid="input-sheet-context-note"
            />
          </div>
        </div>

        {/* Fixed footer with actions */}
        <SheetFooter className="px-4 py-3 border-t bg-background sm:justify-stretch">
          <div className="flex w-full gap-2">
            <Button
              className="flex-1 h-11"
              onClick={onSave}
              disabled={isSaving || !form.tsStart || !form.date}
              data-testid="btn-sheet-save-meal"
            >
              {isSaving ? "Сохраняю..." : "Сохранить изменения"}
            </Button>
            <Button variant="outline" className="h-11" onClick={onClose} data-testid="btn-sheet-cancel-meal">
              Отмена
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
