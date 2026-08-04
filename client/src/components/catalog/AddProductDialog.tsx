import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { emptyForm, type ProductForm } from "./catalogTypes";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  setField: (key: keyof ProductForm, value: string) => void;
}

export function AddProductDialog({ open, onOpenChange, form, setForm, setField }: AddProductDialogProps) {
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof apiRequest>[2]) =>
      apiRequest("POST", "/api/catalog", payload).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      onOpenChange(false);
      setForm(emptyForm());
      toast({ title: "Продукт добавлен в каталог" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  function handleCreate() {
    if (!form.name.trim()) return;
    const entry: Record<string, unknown> = { mealName: form.name.trim() };
    if (form.grams) entry.grams = parseFloat(form.grams);
    if (form.kcal) entry.kcal = parseFloat(form.kcal);
    if (form.protein) entry.protein = parseFloat(form.protein);
    if (form.fat) entry.fat = parseFloat(form.fat);
    if (form.carbs) entry.carbs = parseFloat(form.carbs);

    createMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isSet: false,
      entries: [entry],
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(false);
          setForm(emptyForm());
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Добавить продукт в каталог
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="add-name">
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Например: Куриная грудка"
              maxLength={100}
              autoFocus
              data-testid="input-catalog-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="add-desc">
              Описание <span className="text-muted-foreground text-xs">(необязательно)</span>
            </Label>
            <Input
              id="add-desc"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Отварная, без кожи"
              maxLength={255}
            />
          </div>

          {/* КБЖУ row */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">КБЖУ на порцию (необязательно)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="add-grams" className="text-xs">
                  Граммы
                </Label>
                <Input
                  id="add-grams"
                  type="number"
                  min="0"
                  step="1"
                  value={form.grams}
                  onChange={(e) => setField("grams", e.target.value)}
                  placeholder="100"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-kcal" className="text-xs">
                  Ккал
                </Label>
                <Input
                  id="add-kcal"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.kcal}
                  onChange={(e) => setField("kcal", e.target.value)}
                  placeholder="165"
                  className="h-8 text-sm"
                  data-testid="input-catalog-kcal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-protein" className="text-xs">
                  Белки (г)
                </Label>
                <Input
                  id="add-protein"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.protein}
                  onChange={(e) => setField("protein", e.target.value)}
                  placeholder="31"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-fat" className="text-xs">
                  Жиры (г)
                </Label>
                <Input
                  id="add-fat"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fat}
                  onChange={(e) => setField("fat", e.target.value)}
                  placeholder="3.6"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="add-carbs" className="text-xs">
                  Углеводы (г)
                </Label>
                <Input
                  id="add-carbs"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.carbs}
                  onChange={(e) => setField("carbs", e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setForm(emptyForm());
            }}
          >
            Отмена
          </Button>
          <Button
            disabled={!form.name.trim() || createMutation.isPending}
            onClick={handleCreate}
            data-testid="btn-save-catalog-product"
          >
            {createMutation.isPending ? "Сохраняю..." : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
