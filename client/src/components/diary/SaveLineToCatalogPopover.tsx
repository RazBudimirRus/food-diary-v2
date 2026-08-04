import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookmarkPlus } from "lucide-react";

interface SaveLineToCatalogPopoverProps {
  text: string;
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  variant: "food" | "drink";
  buttonTitle: string;
  ariaLabel: string;
}

/** UX-11: quick save individual food/drink line to catalog. */
export function SaveLineToCatalogPopover({
  text,
  kcal,
  protein,
  fat,
  carbs,
  variant,
  buttonTitle,
  ariaLabel,
}: SaveLineToCatalogPopoverProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const saveLineToCatalogMutation = useMutation({
    mutationFn: ({
      templateName,
      lineText,
      lineKcal,
      lineProtein,
      lineFat,
      lineCarbs,
    }: {
      templateName: string;
      lineText: string;
      lineKcal?: number | null;
      lineProtein?: number | null;
      lineFat?: number | null;
      lineCarbs?: number | null;
    }) =>
      apiRequest("POST", "/api/catalog", {
        name: templateName,
        entries: [{ mealName: lineText, kcal: lineKcal, protein: lineProtein, fat: lineFat, carbs: lineCarbs }],
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      setOpen(false);
      setName("");
      toast({ title: "Добавлено в каталог" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    saveLineToCatalogMutation.mutate({
      templateName: name.trim(),
      lineText: text,
      lineKcal: kcal,
      lineProtein: protein,
      lineFat: fat,
      lineCarbs: carbs,
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setName(text.slice(0, 60));
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={`opacity-0 focus:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-0.5 rounded shrink-0 mt-0.5 ${
            variant === "food" ? "group-hover/food:opacity-100" : "group-hover/drink:opacity-100"
          }`}
          title={buttonTitle}
          aria-label={ariaLabel}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" side="top" align="start">
        <p className="text-xs font-medium">Добавить в каталог</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название шаблона"
          className="h-8 text-sm"
          maxLength={80}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) handleSave();
          }}
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          disabled={!name.trim() || saveLineToCatalogMutation.isPending}
          onClick={handleSave}
        >
          {saveLineToCatalogMutation.isPending ? "Сохраняю..." : "Сохранить"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
