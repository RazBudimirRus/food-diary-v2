import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, Flame } from "lucide-react";
import { MEAL_TYPES, type AddMealFormData, type NutritionResult } from "@/lib/diary-utils";

export type MealFieldsData = AddMealFormData;

interface MealFieldsProps {
  variant: "form" | "sheet";
  form: MealFieldsData;
  setForm: (updater: (f: MealFieldsData) => MealFieldsData) => void;
  todayDate: string;
  hungerLabel: (v: number) => string;
  hungerColor: (v: number) => string;
  deepseekAvailable: boolean;
  kbjuResult: NutritionResult | null;
  kbjuLoading: boolean;
  onAnalyzeKbju: () => void;
  /** When editing, the date the meal originally belonged to — shows move hint if changed. */
  editingOriginalDate?: string | null;
  beforeMealType?: ReactNode;
  afterContext?: ReactNode;
}

function fieldIds(variant: "form" | "sheet") {
  const p = variant === "sheet" ? "sheet" : "";
  const cap = (name: string) => (p ? `${p}${name.charAt(0).toUpperCase()}${name.slice(1)}` : name);
  return {
    date: cap("mealDate"),
    tsStart: cap("tsStart"),
    tsEnd: cap("tsEnd"),
    foodText: cap("foodText"),
    drinkText: cap("drinkText"),
    waterUnits: cap("waterUnits"),
    contextNote: cap("contextNote"),
  };
}

function testId(prefix: string, name: string) {
  return prefix ? `${prefix}${name}` : name;
}

/** Shared presentational meal form fields used by MealForm and MealEditSheet. */
export function MealFields({
  variant,
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
  beforeMealType,
  afterContext,
}: MealFieldsProps) {
  const ids = fieldIds(variant);
  const tid = variant === "sheet" ? "sheet-" : "";

  const timeGridClass = variant === "sheet" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3";
  const drinkGridClass = variant === "sheet" ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <>
      {/* Date field */}
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={ids.date}>
          Дата записи
          {editingOriginalDate && form.date !== editingOriginalDate && (
            <span className="ml-2 text-amber-600 font-normal">— запись будет перенесена в другой день</span>
          )}
          {form.date !== todayDate && <span className="ml-2 text-amber-600 font-normal">— прошедший день</span>}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={ids.date}
            type="date"
            value={form.date}
            max={todayDate}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-auto"
            data-testid={testId(tid, "input-meal-date")}
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
      <div className={timeGridClass}>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={ids.tsStart}>
            Время начала
          </Label>
          <Input
            id={ids.tsStart}
            type="time"
            value={form.tsStart}
            onChange={(e) => setForm((f) => ({ ...f, tsStart: e.target.value }))}
            data-testid={testId(tid, "input-ts-start")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={ids.tsEnd}>
            Время окончания
          </Label>
          <Input
            id={ids.tsEnd}
            type="time"
            value={form.tsEnd}
            onChange={(e) => setForm((f) => ({ ...f, tsEnd: e.target.value }))}
            data-testid={testId(tid, "input-ts-end")}
          />
        </div>
      </div>

      {beforeMealType}

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
              data-testid={testId(tid, `btn-meal-type-${t}`)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Food items */}
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={ids.foodText}>
          Что ел
        </Label>
        <Textarea
          id={ids.foodText}
          rows={2}
          placeholder="Опишите еду..."
          value={form.foodText}
          onChange={(e) => setForm((f) => ({ ...f, foodText: e.target.value }))}
          data-testid={testId(tid, "input-food-text")}
        />
      </div>

      {/* Drink items + water */}
      <div className={drinkGridClass}>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={ids.drinkText}>
            Что пил
          </Label>
          {variant === "sheet" ? (
            <Textarea
              id={ids.drinkText}
              rows={2}
              placeholder="Кофе, вода..."
              value={form.drinkText}
              onChange={(e) => setForm((f) => ({ ...f, drinkText: e.target.value }))}
              data-testid={testId(tid, "input-drink-text")}
            />
          ) : (
            <Input
              id={ids.drinkText}
              placeholder="Кофе, вода..."
              value={form.drinkText}
              onChange={(e) => setForm((f) => ({ ...f, drinkText: e.target.value }))}
              data-testid={testId(tid, "input-drink-text")}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={ids.waterUnits}>
            Кол-во вод (1 = 0.5 л)
          </Label>
          <Input
            id={ids.waterUnits}
            type="number"
            min="0"
            step="0.5"
            placeholder="0"
            value={form.waterUnits}
            onChange={(e) => setForm((f) => ({ ...f, waterUnits: e.target.value }))}
            data-testid={testId(tid, "input-water-units")}
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
            data-testid={testId(tid, "btn-analyze-kbju")}
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
              <div
                className={`flex gap-3 text-xs text-orange-700 dark:text-orange-400${variant === "sheet" ? " flex-wrap" : ""}`}
              >
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
          data-testid={testId(tid, "slider-hunger")}
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
          data-testid={testId(tid, "slider-satiety")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 голод</span>
          <span>5 нейтрально</span>
          <span>10 объелся</span>
        </div>
      </div>

      {/* Context / comment */}
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={ids.contextNote}>
          Контекст приёма <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        {variant === "sheet" ? (
          <Textarea
            id={ids.contextNote}
            rows={2}
            placeholder="Например: ел за компьютером, в спешке..."
            value={form.contextNote}
            onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))}
            data-testid={testId(tid, "input-context-note")}
          />
        ) : (
          <Input
            id={ids.contextNote}
            placeholder="Например: ел за компьютером, в спешке..."
            value={form.contextNote}
            onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))}
            data-testid={testId(tid, "input-context-note")}
          />
        )}
      </div>

      {afterContext}
    </>
  );
}
