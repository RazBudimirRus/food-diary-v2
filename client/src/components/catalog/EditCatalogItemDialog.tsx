import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { CatalogItem } from "./catalogTypes";

interface EditCatalogItemDialogProps {
  editItem: CatalogItem | null;
  editName: string;
  setEditName: (name: string) => void;
  editDesc: string;
  setEditDesc: (desc: string) => void;
  onClose: () => void;
}

export function EditCatalogItemDialog({
  editItem,
  editName,
  setEditName,
  editDesc,
  setEditDesc,
  onClose,
}: EditCatalogItemDialogProps) {
  const { toast } = useToast();

  const renameMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: number; name: string; description?: string }) =>
      apiRequest("PUT", `/api/catalog/${id}`, { name, description }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      onClose();
      toast({ title: "Шаблон обновлён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!editItem} onOpenChange={(v) => !v && onClose()}>
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
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!editName.trim() || renameMutation.isPending}
            onClick={() =>
              editItem && renameMutation.mutate({ id: editItem.id, name: editName, description: editDesc || undefined })
            }
          >
            {renameMutation.isPending ? "Сохраняю..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
