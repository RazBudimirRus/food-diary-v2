/**
 * CatalogPage — UX-7.3: управление каталогом блюд пользователя.
 * Список шаблонов с поиском, переименованием, удалением.
 * UX-новое: кнопка «Добавить продукт» — ручное создание записи в каталоге.
 * Доступен по маршруту /#/catalog
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { BookOpen, Search, ArrowLeft, Plus } from "lucide-react";
import {
  AddProductDialog,
  EditCatalogItemDialog,
  CatalogItemCard,
  emptyForm,
  type CatalogItem,
  type ProductForm,
} from "@/components/catalog";

export default function CatalogPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm());

  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/catalog/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      setDeleteId(null);
      toast({ title: "Шаблон удалён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const [calcKbjuId, setCalcKbjuId] = useState<number | null>(null);
  const calcKbjuMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/catalog/${id}/calculate-kbju`).then((r) => r.json()),
    onSuccess: (data, _id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      setCalcKbjuId(null);
      const r = data.result;
      toast({
        title: "КБЖУ рассчитаны",
        description: `${Math.round(r.calories)} ккал · Б${r.protein} · Ж${r.fat} · У${r.carbs}`,
      });
    },
    onError: (e: Error) => {
      setCalcKbjuId(null);
      toast({ title: "Ошибка AI", description: e.message, variant: "destructive" });
    },
  });

  function openEdit(item: CatalogItem) {
    setEditItem(item);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
  }

  function setField(key: keyof ProductForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAddDialog() {
    setForm(emptyForm());
    setAddOpen(true);
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
          <Button size="sm" className="shrink-0 gap-1.5" onClick={openAddDialog} data-testid="btn-add-catalog-product">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Добавить продукт</span>
            <span className="sm:hidden">Добавить</span>
          </Button>
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
          <div className="text-center py-12 text-muted-foreground space-y-3">
            <BookOpen className="h-10 w-10 mx-auto opacity-20" />
            <p className="text-sm">
              {items.length === 0
                ? "Каталог пуст. Добавьте продукт кнопкой выше или нажмите ⭐ на карточке приёма."
                : "Ничего не найдено"}
            </p>
            {items.length === 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                Добавить первый продукт
              </Button>
            )}
          </div>
        )}

        {/* Items */}
        {filtered.map((item) => (
          <CatalogItemCard
            key={item.id}
            item={item}
            isExpanded={expandedId === item.id}
            onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
            calcKbjuId={calcKbjuId}
            onCalcKbju={(id) => {
              setCalcKbjuId(id);
              calcKbjuMutation.mutate(id);
            }}
            calcKbjuMutation={calcKbjuMutation}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      <AddProductDialog open={addOpen} onOpenChange={setAddOpen} form={form} setForm={setForm} setField={setField} />

      <EditCatalogItemDialog
        editItem={editItem}
        editName={editName}
        setEditName={setEditName}
        editDesc={editDesc}
        setEditDesc={setEditDesc}
        onClose={() => setEditItem(null)}
      />

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
