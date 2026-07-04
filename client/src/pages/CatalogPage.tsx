/**
 * CatalogPage — UX-7.3: управление каталогом блюд пользователя.
 * Список шаблонов с поиском, переименованием, удалением.
 * Доступен по маршруту /#/catalog
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Search, Pencil, Trash2, ArrowLeft, Flame, ChevronDown, ChevronUp } from "lucide-react";

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

export default function CatalogPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Edit dialog
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["/api/catalog"],
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter(
        (it) =>
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          it.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const renameMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: number; name: string; description?: string }) =>
      apiRequest("PUT", `/api/catalog/${id}`, { name, description }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      setEditItem(null);
      toast({ title: "Шаблон обновлён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/catalog/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      setDeleteId(null);
      toast({ title: "Шаблон удалён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  function openEdit(item: CatalogItem) {
    setEditItem(item);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
  }

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <a
            href="#/"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Дневник</span>
          </a>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <BookOpen className="h-4 w-4 text-primary" />
          <h1 className="font-semibold text-base">Каталог блюд</h1>
          <span className="ml-auto text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "шаблон" : items.length < 5 ? "шаблона" : "шаблонов"}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по каталогу..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Empty state */}
        {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Загрузка...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <BookOpen className="h-10 w-10 mx-auto opacity-20" />
            <p className="text-sm">
              {items.length === 0
                ? "Каталог пуст. Нажмите ⭐ на карточке приёма, чтобы сохранить шаблон."
                : "Ничего не найдено"}
            </p>
          </div>
        )}

        {/* Items */}
        {filtered.map((item) => {
          const totalKcal = item.entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
          const isExpanded = expandedId === item.id;
          return (
            <Card key={item.id} className="border hover:shadow-sm transition-shadow">
              <CardContent className="px-4 py-3 space-y-2">
                {/* Row: name + actions */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    )}
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
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      title={isExpanded ? "Свернуть" : "Развернуть"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(item)}
                      title="Переименовать"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(item.id)}
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
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Название</Label>
              <Input
                id="cat-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Описание (необязательно)</Label>
              <Input
                id="cat-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={255}
                placeholder="Например: быстрый завтрак"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Отмена
            </Button>
            <Button
              disabled={!editName.trim() || renameMutation.isPending}
              onClick={() =>
                editItem &&
                renameMutation.mutate({ id: editItem.id, name: editName, description: editDesc || undefined })
              }
            >
              {renameMutation.isPending ? "Сохраняю..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
            <AlertDialogDescription>
              Записи в дневнике питания останутся без изменений. Отменить удаление невозможно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />
    </div>
  );
}
