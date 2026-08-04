import { Flame, ChevronDown, ChevronUp, Pencil, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UseMutationResult } from "@tanstack/react-query";
import type { CatalogItem } from "./catalogTypes";

interface CatalogItemCardProps {
  item: CatalogItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  calcKbjuId: number | null;
  onCalcKbju: (id: number) => void;
  calcKbjuMutation: UseMutationResult<unknown, Error, number, unknown>;
  onEdit: (item: CatalogItem) => void;
  onDelete: (id: number) => void;
}

export function CatalogItemCard({
  item,
  isExpanded,
  onToggleExpand,
  calcKbjuId,
  onCalcKbju,
  calcKbjuMutation,
  onEdit,
  onDelete,
}: CatalogItemCardProps) {
  const totalKcal = item.entries.reduce((s, e) => s + (e.kcal ?? 0), 0);

  return (
    <Card className="border hover:shadow-sm transition-shadow">
      <CardContent className="px-4 py-3 space-y-2">
        {/* Row: name + actions */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-snug">{item.name}</p>
            {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              {totalKcal > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3" />
                  {Math.round(totalKcal)} ккал
                </span>
              )}
              <span className="text-xs text-muted-foreground/60">
                {item.entries.length} {item.entries.length === 1 ? "позиция" : "позиции"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggleExpand}
              title={isExpanded ? "Свернуть" : "Развернуть"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {/* UX-21: AI КБЖУ */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-violet-500"
              onClick={() => onCalcKbju(item.id)}
              disabled={calcKbjuMutation.isPending && calcKbjuId === item.id}
              title="Рассчитать КБЖУ через AI"
              aria-label="Рассчитать КБЖУ"
            >
              <Sparkles
                className={`h-4 w-4 ${calcKbjuMutation.isPending && calcKbjuId === item.id ? "animate-pulse" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(item)}
              title="Переименовать"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded entries */}
        {isExpanded && item.entries.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            {item.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate flex-1">{entry.mealName}</span>
                <span className="ml-2 shrink-0 tabular-nums">
                  {entry.grams ? `${entry.grams} г` : ""}
                  {entry.kcal ? ` · ${Math.round(entry.kcal)} ккал` : ""}
                  {entry.protein || entry.fat || entry.carbs ? (
                    <span className="ml-1 text-muted-foreground/60">
                      {entry.protein ? `Б${entry.protein}` : ""}
                      {entry.fat ? ` Ж${entry.fat}` : ""}
                      {entry.carbs ? ` У${entry.carbs}` : ""}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
