// UX-10: Bottom sheet для редактирования приёма пищи на мобильных устройствах (< md / 768px).
// Переиспользует ту же форму и state, что и инлайн-редактирование на десктопе —
// логика (mutations, КБЖУ-анализ) остаётся в DiaryPage, компонент только рендерит UI.
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { MealFields } from "@/components/diary/MealFields";
import type { AddMealFormData, NutritionResult } from "@/lib/diary-utils";

export type MealEditFormData = AddMealFormData;
export type { NutritionResult };

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
          <MealFields
            variant="sheet"
            form={form}
            setForm={setForm}
            todayDate={todayDate}
            hungerLabel={hungerLabel}
            hungerColor={hungerColor}
            deepseekAvailable={deepseekAvailable}
            kbjuResult={kbjuResult}
            kbjuLoading={kbjuLoading}
            onAnalyzeKbju={onAnalyzeKbju}
            editingOriginalDate={editingOriginalDate}
          />
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
