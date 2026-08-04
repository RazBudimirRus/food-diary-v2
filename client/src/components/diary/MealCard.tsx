// MealCard.tsx — renders a single meal entry card: meal type, food text, drinks,
// hunger/fullness, КБЖУ data, photo upload, and action buttons (edit, delete, save
// to catalog). Extracted verbatim from DiaryPage.tsx (29.4 refactor).
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Clock, Pencil, Camera, Star, Flame, Sparkles } from "lucide-react";
import type { Meal } from "@shared/schema";
import { MEAL_TYPE_COLORS, hungerColor } from "@/lib/diary-utils";
import { SaveLineToCatalogPopover } from "@/components/diary/SaveLineToCatalogPopover";
import { MealPhotoThumb, MealPhotoLightbox } from "@/components/diary/MealPhotoLightbox";

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: number) => void;
  isMobile: boolean;
}

export function MealCard({ meal, onEdit, onDelete, isMobile: _isMobile }: MealCardProps) {
  const { toast } = useToast();

  // UX-19: fetch photos attached to this meal
  const { data: photosData } = useQuery<{ photos: { id: string }[] }>({
    queryKey: [`/api/meals/${meal.id}/photos`],
    staleTime: 30_000,
  });
  const mealPhotos = photosData?.photos ?? [];
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  // UX-18: AI КБЖУ анализ по записи (доступен при наличии DeepSeek)
  const [analyzeKbjuId, setAnalyzeKbjuId] = useState<number | null>(null);
  const analyzeKbjuMutation = useMutation({
    mutationFn: (mealId: number) => apiRequest("POST", `/api/meals/${mealId}/analyze-kbju`).then((r) => r.json()),
    onSuccess: (data) => {
      setAnalyzeKbjuId(null);
      toast({ title: "КБЖУ рассчитан", description: data.note ?? undefined });
      // Invalidate all day queries so MealCard re-renders with updated KBJU
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/days/") });
    },
    onError: (e: Error) => {
      setAnalyzeKbjuId(null);
      toast({ title: "Ошибка анализа", description: e.message, variant: "destructive" });
    },
  });

  const saveToCatalogMutation = useMutation({
    mutationFn: (mealId: number) =>
      apiRequest("POST", `/api/catalog/from-meal/${mealId}`, {
        name: "",
      }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Сохранено в каталог" });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const r = await apiRequest("DELETE", `/api/photos/${photoId}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${meal.id}/photos`] });
      setLightboxId(null);
      toast({ title: "Фото удалено" });
    },
    onError: (e: Error) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ mealId, file }: { mealId: number; file: File }) => {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("mealId", String(mealId));
      const r = await apiRequest("POST", "/api/photos/upload", fd);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Ошибка загрузки");
      return j;
    },
    onSuccess: () => {
      toast({ title: "Фото загружено" });
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${meal.id}/photos`] });
    },
    onError: (e: Error) => toast({ title: "Ошибка фото", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="border hover:shadow-sm transition-shadow" data-testid={`card-meal-${meal.id}`}>
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {meal.tsEnd && meal.tsEnd !== meal.tsStart ? `${meal.tsStart}–${meal.tsEnd}` : meal.tsStart}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEAL_TYPE_COLORS[meal.mealType] ?? ""}`}>
              {meal.mealType}
            </span>
            {meal.hungerBefore != null && (
              <span className={`text-xs font-medium ${hungerColor(meal.hungerBefore)}`}>
                голод: {meal.hungerBefore}
              </span>
            )}
            {meal.satietyAfter != null && (
              <span className={`text-xs font-medium ${hungerColor(meal.satietyAfter)}`}>
                → сытость: {meal.satietyAfter}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(meal)}
              title="Редактировать"
              aria-label="Редактировать запись"
              data-testid={`btn-edit-meal-${meal.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-amber-500"
              onClick={() => saveToCatalogMutation.mutate(meal.id)}
              title="Сохранить в каталог"
              aria-label="Сохранить в каталог шаблонов"
              disabled={saveToCatalogMutation.isPending}
            >
              <Star className="h-4 w-4" />
            </Button>
            <label
              className="h-9 w-9 shrink-0 flex items-center justify-center text-muted-foreground hover:text-blue-500 cursor-pointer rounded-md hover:bg-accent transition-colors"
              title="Прикрепить фото"
              aria-label="Прикрепить фото к записи"
            >
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => uploadPhotoMutation.mutate({ mealId: meal.id, file }));
                }}
              />
            </label>
            {/* UX-18: AI КБЖУ по записи — показывается если есть фото или нет КБЖУ */}
            {(mealPhotos.length > 0 || meal.calories == null) && (meal.foodText || meal.drinkText) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-violet-500"
                onClick={() => {
                  setAnalyzeKbjuId(meal.id);
                  analyzeKbjuMutation.mutate(meal.id);
                }}
                disabled={analyzeKbjuMutation.isPending && analyzeKbjuId === meal.id}
                title="Рассчитать КБЖУ через AI"
                aria-label="Рассчитать КБЖУ через AI"
                data-testid={`btn-analyze-kbju-${meal.id}`}
              >
                <Sparkles
                  className={`h-4 w-4 ${
                    analyzeKbjuMutation.isPending && analyzeKbjuId === meal.id ? "animate-pulse" : ""
                  }`}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(meal.id)}
              title="Удалить"
              aria-label="Удалить запись"
              data-testid={`btn-delete-meal-${meal.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {meal.foodText && (
          <div className="flex items-start gap-1 mt-1.5 group/food">
            <p className="text-sm text-foreground flex-1">🍽 {meal.foodText}</p>
            <SaveLineToCatalogPopover
              text={meal.foodText}
              kcal={meal.calories}
              protein={meal.protein}
              fat={meal.fat}
              carbs={meal.carbs}
              variant="food"
              buttonTitle="Сохранить в каталог"
              ariaLabel="Сохранить блюдо в каталог"
            />
          </div>
        )}
        {meal.drinkText && (
          <div className="flex items-start gap-1 mt-0.5 group/drink">
            <p className="text-sm text-foreground flex-1">
              💧 {meal.drinkText}
              {meal.waterUnits ? (
                <span className="text-muted-foreground text-xs ml-1">({(meal.waterUnits * 0.5).toFixed(1)} л)</span>
              ) : null}
            </p>
            <SaveLineToCatalogPopover
              text={meal.drinkText}
              variant="drink"
              buttonTitle="Сохранить напиток в каталог"
              ariaLabel="Сохранить напиток в каталог"
            />
          </div>
        )}
        {meal.contextNote && <p className="text-xs mt-1 text-muted-foreground italic">"{meal.contextNote}"</p>}
        {/* КБЖУ badge */}
        {meal.calories != null && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-md px-2 py-1 w-fit">
            <Flame className="h-3 w-3" />
            <span>{Math.round(meal.calories)} ккал</span>
            {meal.protein != null && <span>· Б {meal.protein.toFixed(1)}</span>}
            {meal.fat != null && <span>· Ж {meal.fat.toFixed(1)}</span>}
            {meal.carbs != null && <span>· У {meal.carbs.toFixed(1)}</span>}
          </div>
        )}

        {/* UX-19: photo thumbnails */}
        {mealPhotos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mealPhotos.map((p) => (
              <MealPhotoThumb key={p.id} id={p.id} onClick={() => setLightboxId(p.id)} />
            ))}
          </div>
        )}

        {/* UX-19: lightbox */}
        {lightboxId && (
          <MealPhotoLightbox
            id={lightboxId}
            onClose={() => setLightboxId(null)}
            onDelete={() => deletePhotoMutation.mutate(lightboxId)}
          />
        )}
      </CardContent>
    </Card>
  );
}
