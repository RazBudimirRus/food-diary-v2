import { useCallback, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppTheme } from "@/lib/theme-context";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { OnboardingTour } from "@/components/OnboardingTour";
import { TodayWidget } from "@/components/TodayWidget";
import { BottomNav } from "@/components/BottomNav";
import { GoalCard } from "@/components/GoalCard";
import { ProfileQuestionnaire } from "@/components/ProfileQuestionnaire";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { Button } from "@/components/ui/button";
import { Plus, Utensils, Loader2, Sparkles } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import type { Day, Meal } from "@shared/schema";
import { getCalendarWeekRange } from "@shared/dates";
import { formatDate, mskToday, prevDay, nextDay } from "@/lib/diary-utils";
import { MealCard } from "@/components/diary/MealCard";
import { MealForm } from "@/components/diary/MealForm";
import { DaySummary } from "@/components/diary/DaySummary";
import { DayCommentBox } from "@/components/diary/DayCommentBox";
import { DiaryHeader } from "@/components/diary/DiaryHeader";
import { DeleteMealDialog, ReportRangeDialog } from "@/components/diary/DiaryDialogs";

// ── Main page ─────────────────────────────────────────────────────────────────
// Orchestrates: selected date, which dialog is open, and cross-component
// data flow. Rendering for the meal list/form/summary/header lives in
// client/src/components/diary/*.

export default function DiaryPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAppTheme();
  const [location] = useLocation();
  const pwa = usePwaInstall();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeDate, setActiveDate] = useState<string>(mskToday());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Report range dialog state (Phase 21)
  const [showRangeDialog, setShowRangeDialog] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<string>(mskToday());
  const [rangeTo, setRangeTo] = useState<string>(mskToday());

  // Profile questionnaire (Phase 17)
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // UX-12: batch КБЖУ calculation for the whole day
  const [batchCalculating, setBatchCalculating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [deepseekAvailable, setDeepseekAvailable] = useState(false);

  const handleIdleWarning = useCallback(() => {
    toast({
      title: "Сессия скоро завершится",
      description: "Через 5 минут бездействия будет выполнен автоматический выход.",
    });
  }, [toast]);

  const handleIdleTimeout = useCallback(() => {
    toast({ title: "Сессия завершена", description: "Вы вышли автоматически из-за 30 минут бездействия." });
    void logout();
  }, [logout, toast]);

  useIdleTimer(handleIdleWarning, handleIdleTimeout);

  useKeyboardShortcuts([
    { key: "n", onTrigger: () => !showAddForm && openAddMealForm(), enabled: !showAddForm },
    { key: "r", onTrigger: () => downloadReport(activeDate), enabled: !showAddForm },
  ]);

  const { step: tourStep, active: tourActive, next: tourNext, skip: tourSkip, triggerTour } = useOnboardingTour();

  const { data, isLoading } = useQuery<{ day: Day; meals: Meal[] }>({
    queryKey: [`/api/days/${activeDate}`],
  });
  const day = data?.day;
  const meals = data?.meals ?? [];

  // Auto-show profile questionnaire on first login (Phase 17)
  const { data: profileData } = useQuery<{ profile: any | null }>({
    queryKey: ["/api/user/profile"],
    staleTime: Infinity,
  });
  useEffect(() => {
    if (profileData === undefined) return;
    const p = profileData?.profile;
    const needsOnboarding = !p || (!p.onboardingSkipped && p.heightCm == null && p.weightKg == null);
    if (needsOnboarding) setShowProfileDialog(true);
  }, [profileData]);

  // Check if DeepSeek is available (used by the batch КБЖУ button)
  useEffect(() => {
    apiRequest("GET", "/api/analyze/available")
      .then((r) => r.json())
      .then((d) => setDeepseekAvailable(!!d.available))
      .catch(() => setDeepseekAvailable(false));
  }, []);

  const restoreMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/meals/${id}/restore`);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
      toast({ title: "Запись восстановлена" });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/meals/${id}`);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
      setDeleteConfirmId(null);
      toast({
        title: "Запись удалена",
        action: (
          <ToastAction altText="Отменить удаление" onClick={() => restoreMealMutation.mutate(id)}>
            Отменить
          </ToastAction>
        ),
      });
    },
  });

  // ── Form open/close orchestration ────────────────────────────────────────
  function openAddMealForm() {
    setEditingMeal(null);
    setShowAddForm(true);
  }
  function openEditMealForm(meal: Meal) {
    setEditingMeal(meal);
    setShowAddForm(true);
  }
  function closeMealForm() {
    setShowAddForm(false);
    setEditingMeal(null);
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  async function downloadReport(date: string, force = false) {
    const res = await apiRequest("GET", `/api/report/${date}${force ? "?force=1" : ""}`);
    if (res.status === 202) {
      toast({ title: "Заполните итоги дня перед скачиванием отчёта", variant: "destructive" });
      return;
    }
    if (!res.ok) {
      toast({ title: "Ошибка", description: "Не удалось сформировать отчёт", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Дневник_питания_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Файл загружен" });
  }

  async function downloadRangeReport(from: string, to: string) {
    if (from > to) {
      toast({ title: "Ошибка", description: "Дата начала позже даты окончания", variant: "destructive" });
      return;
    }
    const res = await apiRequest("GET", `/api/report/range?from=${from}&to=${to}`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}) as any);
      toast({ title: "Ошибка", description: d.error || "Не удалось сформировать отчёт", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Дневник_питания_${from}_${to}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Файл загружен" });
  }

  function downloadWeekReport() {
    const { from, to } = getCalendarWeekRange(activeDate);
    const today = mskToday();
    downloadRangeReport(from, to > today ? today : to);
  }

  // UX-12: batch КБЖУ for meals without calculated nutrition
  const uncalculatedMeals = meals.filter((m) => m.calories == null);
  const hasMealsToCalculate = uncalculatedMeals.length > 0;

  async function calculateAllKbzhu() {
    if (!hasMealsToCalculate || batchCalculating) return;
    const targets = uncalculatedMeals;
    setBatchCalculating(true);
    setBatchProgress({ done: 0, total: targets.length });

    let succeeded = 0;
    for (const meal of targets) {
      try {
        if (!meal.foodText && !meal.drinkText) continue;
        const analyzeRes = await apiRequest("POST", "/api/analyze", {
          foodText: meal.foodText ?? "",
          drinkText: meal.drinkText ?? "",
        });
        if (analyzeRes.ok) {
          const nutrition = await analyzeRes.json();
          const patchRes = await apiRequest("PATCH", `/api/meals/${meal.id}`, {
            calories: nutrition.calories,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbs: nutrition.carbs,
          });
          if (patchRes.ok) succeeded += 1;
        }
      } catch {
        // пропускаем ошибку и продолжаем с остальными приёмами
      }
      setBatchProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setBatchCalculating(false);
    await queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
    toast({
      title:
        succeeded > 0 ? `КБЖУ рассчитано для ${succeeded} из ${targets.length} приёмов` : "Не удалось рассчитать КБЖУ",
      variant: succeeded > 0 ? undefined : "destructive",
    });
  }

  const isToday = activeDate === mskToday();
  const totalWater = meals.reduce((s, m) => s + (m.waterUnits ?? 0) * 0.5, 0);
  const totalKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const hasKcal = meals.some((m) => m.calories != null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <DiaryHeader
        activeDate={activeDate}
        isToday={isToday}
        userRole={user?.role}
        userLabel={user?.displayName || user?.username}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={logout}
        onTriggerTour={triggerTour}
        onOpenProfile={() => setShowProfileDialog(true)}
        onPrevDay={() => setActiveDate(prevDay(activeDate))}
        onNextDay={() => setActiveDate(nextDay(activeDate))}
        onDownloadDay={() => downloadReport(activeDate)}
        onDownloadWeek={downloadWeekReport}
        onOpenRangeDialog={() => {
          setRangeFrom(activeDate);
          setRangeTo(activeDate);
          setShowRangeDialog(true);
        }}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
        {isToday && (
          <TodayWidget
            mealsCount={meals.length}
            totalKcal={totalKcal}
            totalWater={totalWater}
            steps={day?.steps}
            hasKcal={hasKcal}
          />
        )}

        <DaySummary day={day} meals={meals} date={activeDate} />

        {deepseekAvailable && hasMealsToCalculate && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={calculateAllKbzhu}
              disabled={batchCalculating}
              className="gap-1"
              data-testid="btn-calculate-all-kbzhu"
            >
              {batchCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {batchProgress.done}/{batchProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Рассчитать КБЖУ за день
                </>
              )}
            </Button>
          </div>
        )}

        {day && (
          <div className="flex items-center gap-2 flex-wrap">
            <DayCommentBox day={day} date={activeDate} onSaved={() => {}} />
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && meals.length === 0 && (
          <div className="text-center py-14 text-muted-foreground">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Utensils className="h-9 w-9 text-primary/40" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <span className="text-xs">🌅</span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/70">
              {isToday ? "Сегодня ещё нет записей" : `Нет записей за ${formatDate(activeDate)}`}
            </p>
            <p className="text-xs mt-1.5 max-w-xs mx-auto">
              {isToday
                ? "Нажмите «+ Добавить приём» чтобы начать вести дневник питания"
                : "В этот день записи не вносились"}
            </p>
            {isToday && (
              <p className="text-xs mt-3 text-muted-foreground/60">Совет: нажмите N для быстрого добавления</p>
            )}
          </div>
        )}

        <GoalCard
          todayKcal={meals.reduce((s, m) => s + (m.calories ?? 0), 0)}
          todayProtein={meals.reduce((s, m) => s + (m.protein ?? 0), 0)}
          todayFat={meals.reduce((s, m) => s + (m.fat ?? 0), 0)}
          todayCarbs={meals.reduce((s, m) => s + (m.carbs ?? 0), 0)}
          todayWaterL={meals.reduce((s, m) => s + (m.waterUnits ?? 0) * 0.5, 0)}
        />

        {/* UX-15: форма добавления/кнопка всегда под GoalCard, выше списка приёмов */}
        {!showAddForm && (
          <Button className="w-full" variant="outline" onClick={openAddMealForm} data-testid="btn-add-meal">
            <Plus className="h-4 w-4 mr-2" />
            Добавить приём пищи
          </Button>
        )}

        {/* MealForm renders inline on desktop; delegates to the mobile bottom
            sheet internally when editing on mobile (UX-10). */}
        {showAddForm && (
          <MealForm
            open={showAddForm}
            onOpenChange={setShowAddForm}
            date={activeDate}
            defaultDate={activeDate}
            editingMeal={editingMeal}
            onSaved={closeMealForm}
          />
        )}

        <div className="space-y-2">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onEdit={openEditMealForm}
              onDelete={(id) => setDeleteConfirmId(id)}
              isMobile={isMobile}
            />
          ))}
        </div>
      </main>

      <DeleteMealDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && deleteMealMutation.mutate(deleteConfirmId)}
        isDeleting={deleteMealMutation.isPending}
      />

      <OnboardingTour step={tourStep} active={tourActive} onNext={tourNext} onSkip={tourSkip} />
      <BottomNav isAdmin={user?.role === "admin"} isDoctor={user?.role === "doctor"} currentPath={location} />

      <ReportRangeDialog
        open={showRangeDialog}
        onOpenChange={setShowRangeDialog}
        from={rangeFrom}
        to={rangeTo}
        onFromChange={setRangeFrom}
        onToChange={setRangeTo}
        onDownload={() => downloadRangeReport(rangeFrom, rangeTo)}
      />

      <ProfileQuestionnaire open={showProfileDialog} onClose={() => setShowProfileDialog(false)} />

      <PwaInstallBanner
        show={pwa.showBanner}
        isIos={pwa.isIosSafari}
        canInstall={pwa.canInstall}
        onInstall={pwa.install}
        onDismiss={pwa.dismiss}
      />
    </div>
  );
}
