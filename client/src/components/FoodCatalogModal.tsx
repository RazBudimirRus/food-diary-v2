/**
 * FoodCatalogModal — UX-7.
 * Модальное окно выбора шаблона из каталога блюд.
 * Вызывается из формы добавления приёма пищи.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CatalogEntry {
  id: number;
  mealName: string;
  grams?: number | null;
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
}

interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  isSet: boolean;
  createdAt: string;
  entries: CatalogEntry[];
}

interface FoodCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
}

export function FoodCatalogModal({ open, onClose, onSelect }: FoodCatalogModalProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["/api/catalog"],
    enabled: open,
    staleTime: 60_000,
  });

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Из каталога
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Найти шаблон..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Загрузка...</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {items.length === 0 ? "Каталог пуст. Сохраните приём пищи как шаблон." : "Ничего не найдено"}
              </p>
            </div>
          )}
          {filtered.map((item) => {
            const totalKcal = item.entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
            return (
              <button
                key={item.id}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                    )}
                    {item.entries.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {totalKcal > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {Math.round(totalKcal)} ккал
                          </Badge>
                        )}
                        {item.entries.slice(0, 2).map((e) => (
                          <span key={e.id} className="text-xs text-muted-foreground">
                            {e.mealName}
                          </span>
                        ))}
                        {item.entries.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{item.entries.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        <Button variant="outline" className="mt-1" onClick={onClose}>
          Отмена
        </Button>
      </DialogContent>
    </Dialog>
  );
}
