import { useCallback, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppTheme } from "@/App";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { OnboardingTour } from "@/components/OnboardingTour";
import { TodayWidget } from "@/components/TodayWidget";
import { BottomNav } from "@/components/BottomNav";
import { GoalCard } from "@/components/GoalCard";
import { FoodCatalogModal } from "@/components/FoodCatalogModal";
import { ProfileQuestionnaire } from "@/components/ProfileQuestionnaire";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Utensils,
  Droplets,
  Activity,
  Sun,
  Moon,
  Footprints,
  LogOut,
  Calculator,
  Flame,
  MoreVertical,
  BarChart3,
  Shield,
  HelpCircle,
  ClipboardList,
  BookOpen,
  Camera,
  Star,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Day, Meal } from "@shared/schema";
import {
  formatDateTimeRu,
  inferSleepDate,
  resolveSleepDate,
  resolveWakeDate,
  addDays,
  getCalendarWeekRange,
} from "@shared/dates";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

const DAY_NAMES_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

/** Returns "Ср · 25.06" for a given YYYY-MM-DD string */
function formatDateWithWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const dayOfWeek = DAY_NAMES_SHORT[new Date(`${y}-${m}-${d}T12:00:00Z`).getUTCDay()];
  return `${dayOfWeek} · ${d}.${m}`;
}

function mskToday(): string {
  // MSK = UTC+3
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function mskNow(): string {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return now.toISOString().slice(11, 16);
}

function prevDay(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDay(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const MEAL_TYPES = ["завтрак", "обед", "перекус", "ужин"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_TYPE_COLORS: Record<string, string> = {
  завтрак: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  обед: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  перекус: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ужин: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// ── Hunger labels ─────────────────────────────────────────────────────────────
function hungerLabel(v: number): string {
  const labels: Record<number, string> = {
    0: "0 — Экстремальный голод",
    1: "1 — Сильный голод",
    2: "2 — Ощутимый голод",
    3: "3 — Основательно проголодался",
    4: "4 — Лёгкий голод",
    5: "5 — Нейтрально",
    6: "6 — Лёгкая сытость",
    7: "7 — Комфортная сытость",
    8: "8 — Переел",
    9: "9 — Дискомфорт",
    10: "10 — Экстремальное переедание",
  };
  return labels[v] ?? String(v);
}

function hungerColor(v: number): string {
  if (v <= 2) return "text-red-500";
  if (v <= 7) return "text-green-600";
  return "text-red-500";
}

// ── КБЖУ result type ──────────────────────────────────────────────────────────
interface NutritionResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  note?: string;
}

// ── Add Meal Form ─────────────────────────────────────────────────────────────

interface AddMealFormData {
  date: string;
  tsStart: string;
  tsEnd: string;
  mealType: MealType;
  foodText: string;
  drinkText: string;
  waterUnits: string;
  hungerBefore: number;
  satietyAfter: number;
  contextNote: string;
}

function defaultForm(): AddMealFormData {
  return {
    date: mskToday(),
    tsStart: mskNow(),
    tsEnd: "",
    mealType: "перекус",
    foodText: "",
    drinkText: "",
    waterUnits: "",
    hungerBefore: 4,
    satietyAfter: 7,
    contextNote: "",
  };
}

function formFromMeal(meal: Meal, date: string): AddMealFormData {
  return {
    date,
    tsStart: meal.tsStart,
    tsEnd: meal.tsEnd ?? "",
    mealType: meal.mealType as MealType,
    foodText: meal.foodText ?? "",
    drinkText: meal.drinkText ?? "",
    waterUnits: meal.waterUnits != null ? String(meal.waterUnits) : "",
    hungerBefore: meal.hungerBefore ?? 4,
    satietyAfter: meal.satietyAfter ?? 7,
    contextNote: meal.contextNote ?? "",
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiaryPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAppTheme();
  const [location] = useLocation();
  const pwa = usePwaInstall();
  const { toast } = useToast();
  const [activeDate, setActiveDate] = useState<string>(mskToday());
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddMealFormData>(defaultForm());
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryForm, setSummaryForm] = useState({
    wakeTime: "",
    sleepTime: "",
    wakeDate: "",
    sleepDate: "",
    sportActivity: "",
    steps: "",
    dayComment: "",
  });
  const [pendingDownloadDate, setPendingDownloadDate] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [uploadingPhotoMealId, setUploadingPhotoMealId] = useState<number | null>(null);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [editingOriginalDate, setEditingOriginalDate] = useState<string | null>(null);

  // Report range dialog state (Phase 21)
  const [showRangeDialog, setShowRangeDialog] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<string>(mskToday());
  const [rangeTo, setRangeTo] = useState<string>(mskToday());

  // Profile questionnaire (Phase 17)
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // КБЖУ analysis state
  const [kbjuResult, setKbjuResult] = useState<NutritionResult | null>(null);
  const [kbjuLoading, setKbjuLoading] = useState(false);
  const [deepseekAvailable, setDeepseekAvailable] = useState(false);

  const handleIdleWarning = useCallback(() => {
    toast({
      title: "Сессия скоро завершится",
      description: "Через 5 минут бездействия будет выполнен автоматический выход.",
    });
  }, [toast]);

  const handleIdleTimeout = useCallback(() => {
    toast({
      title: "Сессия завершена",
      description: "Вы вышли автоматически из-за 30 минут бездействия.",
    });
    void logout();
  }, [logout, toast]);

  useIdleTimer(handleIdleWarning, handleIdleTimeout);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      onTrigger: () => {
        if (!showAddForm) setShowAddForm(true);
      },
      enabled: !showAddForm && !showSummaryDialog,
    },
    {
      key: "r",
      onTrigger: () => downloadReport(activeDate),
      enabled: !showAddForm && !showSummaryDialog,
    },
  ]);

  // Onboarding tour
  const { step: tourStep, active: tourActive, next: tourNext, skip: tourSkip, triggerTour } = useOnboardingTour();

  // Fetch day data
  const { data, isLoading } = useQuery<{ day: Day; meals: Meal[] }>({
    queryKey: [`/api/days/${activeDate}`],
  });

  const day = data?.day;
  const meals = data?.meals ?? [];
  const isEditingMeal = editingMealId !== null;

  // Auto-show profile questionnaire on first login (Phase 17)
  const { data: profileData } = useQuery<{ profile: any | null }>({
    queryKey: ["/api/user/profile"],
    staleTime: Infinity, // fetch once per session
  });
  useEffect(() => {
    if (profileData === undefined) return;
    const p = profileData?.profile;
    const needsOnboarding = !p || (!p.onboardingSkipped && p.heightCm == null && p.weightKg == null);
    if (needsOnboarding) setShowProfileDialog(true);
  }, [profileData]);

  // Check if DeepSeek is available
  useEffect(() => {
    apiRequest("GET", "/api/analyze/available")
      .then((r) => r.json())
      .then((d) => setDeepseekAvailable(!!d.available))
      .catch(() => setDeepseekAvailable(false));
  }, []);

  // Keep summary form in sync when day loads (pre-fill)
  useEffect(() => {
    if (day) {
      setSummaryForm({
        wakeTime: day.wakeTime ?? "",
        sleepTime: day.sleepTime ?? "",
        wakeDate: day.wakeDate ?? activeDate,
        sleepDate: day.sleepDate ?? inferSleepDate(activeDate, day.sleepTime) ?? activeDate,
        sportActivity: day.sportActivity ?? "",
        steps: day.steps != null ? String(day.steps) : "",
        dayComment: day.dayComment ?? "",
      });
    }
  }, [day, activeDate]);

  // Reset КБЖУ when form food/drink changes
  useEffect(() => {
    setKbjuResult(null);
  }, [form.foodText, form.drinkText]);

  // ── КБЖУ analysis ──────────────────────────────────────────────────────────

  async function analyzeKbju() {
    if (!form.foodText && !form.drinkText) {
      toast({ title: "Укажите еду или напитки", variant: "destructive" });
      return;
    }
    setKbjuLoading(true);
    setKbjuResult(null);
    try {
      const res = await apiRequest("POST", "/api/analyze", {
        foodText: form.foodText,
        drinkText: form.drinkText,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Ошибка анализа");
      }
      const data: NutritionResult = await res.json();
      setKbjuResult(data);
    } catch (e: any) {
      toast({ title: "Ошибка расчёта КБЖУ", description: e.message, variant: "destructive" });
    } finally {
      setKbjuLoading(false);
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addMealMutation = useMutation({
    mutationFn: async (data: AddMealFormData) => {
      const payload: Record<string, unknown> = {
        ...data,
        // date field controls which day the meal is saved to
      };
      // Attach КБЖУ if available
      if (kbjuResult) {
        payload.calories = kbjuResult.calories;
        payload.protein = kbjuResult.protein;
        payload.fat = kbjuResult.fat;
        payload.carbs = kbjuResult.carbs;
      }
      const res = await apiRequest("POST", "/api/meals", payload);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${variables.date}`] });
      // Also invalidate activeDate if different
      if (variables.date !== activeDate) {
        queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
      }
      setShowAddForm(false);
      setForm(defaultForm());
      setKbjuResult(null);
      toast({ title: "Приём добавлен" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data, originalDate }: { id: number; data: AddMealFormData; originalDate: string }) => {
      const payload: Record<string, unknown> = {
        tsStart: data.tsStart,
        tsEnd: data.tsEnd,
        mealType: data.mealType,
        foodText: data.foodText,
        drinkText: data.drinkText,
        waterUnits: data.waterUnits,
        hungerBefore: data.hungerBefore,
        satietyAfter: data.satietyAfter,
        contextNote: data.contextNote,
        date: data.date,
      };
      if (kbjuResult) {
        payload.calories = kbjuResult.calories;
        payload.protein = kbjuResult.protein;
        payload.fat = kbjuResult.fat;
        payload.carbs = kbjuResult.carbs;
      }
      const res = await apiRequest("PATCH", `/api/meals/${id}`, payload);
      if (!res.ok) throw new Error(await res.text());
      return { ...((await res.json()) as { meal: Meal }), originalDate };
    },
    onSuccess: ({ originalDate }) => {
      const targetDate = form.date;
      queryClient.invalidateQueries({ queryKey: [`/api/days/${targetDate}`] });
      if (originalDate !== targetDate) {
        queryClient.invalidateQueries({ queryKey: [`/api/days/${originalDate}`] });
        if (activeDate === originalDate) {
          setActiveDate(targetDate);
        }
      }
      setShowAddForm(false);
      setEditingMealId(null);
      setEditingOriginalDate(null);
      setForm(defaultForm());
      setKbjuResult(null);
      toast({
        title: originalDate !== targetDate ? "Приём перенесён" : "Приём обновлён",
        description:
          originalDate !== targetDate
            ? `Запись перемещена с ${formatDate(originalDate)} на ${formatDate(targetDate)}`
            : undefined,
      });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
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

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ mealId, file }: { mealId: number; file: File }) => {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("mealId", String(mealId));
      const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Ошибка загрузки");
      return j;
    },
    onSuccess: () => {
      toast({ title: "Фото загружено" });
      setUploadingPhotoMealId(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка фото", description: e.message, variant: "destructive" }),
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/meals/${id}`);
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
      setDeleteConfirmId(null);
      toast({ title: "Запись удалена" });
    },
  });

  const saveSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!day) throw new Error("Day not loaded");
      const res = await apiRequest("POST", `/api/days/${day.id}/summary`, {
        ...summaryForm,
        steps: summaryForm.steps ? Number(summaryForm.steps) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/days/${activeDate}`] });
      setShowSummaryDialog(false);
      if (pendingDownloadDate) {
        downloadReport(pendingDownloadDate, true);
        setPendingDownloadDate(null);
      } else {
        toast({ title: "Итоги дня сохранены" });
      }
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Download report ────────────────────────────────────────────────────────

  function openAddMealForm() {
    setForm(defaultForm());
    setEditingMealId(null);
    setEditingOriginalDate(null);
    setKbjuResult(null);
    setShowAddForm(true);
  }

  function openEditMealForm(meal: Meal) {
    setForm(formFromMeal(meal, activeDate));
    setEditingMealId(meal.id);
    setEditingOriginalDate(activeDate);
    setKbjuResult(null);
    setShowAddForm(true);
  }

  function closeMealForm() {
    setShowAddForm(false);
    setEditingMealId(null);
    setEditingOriginalDate(null);
    setKbjuResult(null);
  }

  /** Phase 21: download multi-day range report */
  async function downloadRangeReport(from: string, to: string) {
    try {
      const res = await apiRequest("GET", `/api/report/range?from=${from}&to=${to}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Ошибка", description: data.error || "Не удалось сформировать отчёт", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Дневник_питания_${from}_${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Файл загружен" });
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения с сервером", variant: "destructive" });
    }
  }

  async function downloadReport(date: string, force = false) {
    const res = await apiRequest("GET", `/api/report/${date}${force ? "?force=1" : ""}`);
    if (res.status === 202) {
      // Need summary
      setPendingDownloadDate(date);
      setShowSummaryDialog(true);
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

  /** Download a multi-day Excel report for [from, to] (Phase 21) */
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

  /** Download report for the calendar week containing the active date */
  function downloadWeekReport() {
    const { from, to } = getCalendarWeekRange(activeDate);
    const today = mskToday();
    downloadRangeReport(from, to > today ? today : to);
  }

  // ── Summary totals ─────────────────────────────────────────────────────────
  const totalWater = meals.reduce((s, m) => s + (m.waterUnits ?? 0) * 0.5, 0);
  const avgSatiety = meals.filter((m) => m.satietyAfter != null).length
    ? (
        meals.reduce((s, m) => s + (m.satietyAfter ?? 0), 0) / meals.filter((m) => m.satietyAfter != null).length
      ).toFixed(1)
    : "—";

  // Total kcal for stats bar (only meals with calories)
  const totalKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const hasKcal = meals.some((m) => m.calories != null);

  const isToday = activeDate === mskToday();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header — two-row layout for mobile (row1: logo+actions, row2: date-nav) */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-2 flex flex-col gap-1">
          {/* Row 1: logo (left) + action buttons (right) */}
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              {/* Logo */}
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-label="Food Diary">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
                <path
                  d="M10 10 Q10 7 13 7 Q16 7 16 10 L16 22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-primary"
                />
                <path
                  d="M19 7 L19 13 Q19 16 22 16 L22 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-primary"
                />
                <path
                  d="M20.5 13 Q19 13 19 14.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <span className="font-semibold text-base truncate">Дневник питания</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Desktop nav links (hidden on mobile — moved to BottomNav) */}
              <Button size="sm" variant="outline" className="hidden sm:flex" asChild data-testid="link-analytics">
                <a href="#/analytics">
                  <BarChart3 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Аналитика</span>
                </a>
              </Button>
              {(user?.role === "doctor" || user?.role === "admin") && (
                <a
                  href="#/doctor"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Stethoscope className="h-4 w-4" />
                  Кабинет врача
                </a>
              )}
              {user?.role === "admin" && (
                <Button size="sm" variant="outline" className="hidden sm:flex" asChild data-testid="link-admin">
                  <a href="#/admin">
                    <Shield className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Админ</span>
                  </a>
                </Button>
              )}
              {/* Download report dropdown — Phase 21 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 sm:w-auto sm:px-3"
                    data-testid="btn-download-report"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Отчёт</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadReport(activeDate)}>
                    За день ({formatDate(activeDate)})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadWeekReport}>За текущую неделю</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setRangeFrom(activeDate);
                      setRangeTo(activeDate);
                      setShowRangeDialog(true);
                    }}
                  >
                    За период…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Profile button + username — desktop only */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hidden sm:flex"
                onClick={() => setShowProfileDialog(true)}
                title="Моя анкета"
                data-testid="btn-open-profile"
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user?.displayName || user?.username}
              </span>
              {/* Theme toggle */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={toggleTheme}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                data-testid="btn-toggle-theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {/* More menu on mobile: logout + analytics + admin */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 sm:hidden" aria-label="Меню">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href="#/analytics" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Аналитика
                    </a>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <a href="#/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Админ
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)} className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Моя анкета
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={triggerTour} className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" /> Показать подсказки
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Logout button on desktop */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hidden sm:flex"
                onClick={logout}
                title="Выйти"
                data-testid="btn-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Row 2: date navigation (centered) */}
          <div className="flex items-center justify-center gap-1 pb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveDate(prevDay(activeDate))}
              data-testid="btn-prev-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              className="text-sm font-medium px-2 py-1 rounded hover:bg-secondary transition-colors"
              onClick={() => setActiveDate(mskToday())}
              data-testid="btn-date-label"
            >
              {isToday ? "Сегодня" : formatDateWithWeekday(activeDate)}
              {isToday && (
                <span className="text-xs text-muted-foreground ml-1">({formatDateWithWeekday(activeDate)})</span>
              )}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveDate(nextDay(activeDate))}
              disabled={activeDate >= mskToday()}
              data-testid="btn-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
        {/* Today widget — only shown for today */}
        {isToday && (
          <TodayWidget
            mealsCount={meals.length}
            totalKcal={totalKcal}
            totalWater={totalWater}
            steps={day?.steps}
            hasKcal={hasKcal}
          />
        )}

        {/* Stats bar */}
        {meals.length > 0 && (
          <div className={`grid gap-2 text-sm ${hasKcal ? "grid-cols-4" : "grid-cols-3"}`}>
            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
              <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Приёмов:</span>
              <span className="font-medium">{meals.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
              <Droplets className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">Вода:</span>
              <span className="font-medium">{totalWater.toFixed(1)} л</span>
            </div>
            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Сытость:</span>
              <span className="font-medium">{avgSatiety}</span>
            </div>
            {hasKcal && (
              <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-muted-foreground">Ккал:</span>
                <span className="font-medium">{Math.round(totalKcal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Day summary badge */}
        {day && (
          <div className="flex items-center gap-2 flex-wrap">
            {day.summaryFilled ? (
              <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 flex-wrap">
                {day.wakeTime && (
                  <span className="flex items-center gap-1">
                    <Sun className="h-3 w-3" />
                    Подъём: <b>{formatDateTimeRu(resolveWakeDate(day.date, day.wakeDate) ?? day.date, day.wakeTime)}</b>
                  </span>
                )}
                {day.sleepTime && (
                  <span className="flex items-center gap-1">
                    <Moon className="h-3 w-3" />
                    Отбой:{" "}
                    <b>
                      {formatDateTimeRu(
                        resolveSleepDate(day.date, day.sleepTime, day.sleepDate) ?? day.date,
                        day.sleepTime,
                      )}
                    </b>
                  </span>
                )}
                {day.steps != null && (
                  <span className="flex items-center gap-1">
                    <Footprints className="h-3 w-3" />
                    Шаги: <b>{day.steps}</b>
                  </span>
                )}
                {day.sportActivity && (
                  <span>
                    Спорт: <b>{day.sportActivity}</b>
                  </span>
                )}
                <button className="text-primary underline" onClick={() => setShowSummaryDialog(true)}>
                  изменить
                </button>
              </div>
            ) : (
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => {
                  setPendingDownloadDate(null);
                  setShowSummaryDialog(true);
                }}
                data-testid="btn-add-summary"
              >
                + Добавить итоги дня (подъём, спорт, шаги)
              </button>
            )}
          </div>
        )}

        {/* Meal list */}
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
        <div className="space-y-2">
          {meals.map((meal) => (
            <Card
              key={meal.id}
              className="border hover:shadow-sm transition-shadow"
              data-testid={`card-meal-${meal.id}`}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {meal.tsEnd && meal.tsEnd !== meal.tsStart ? `${meal.tsStart}–${meal.tsEnd}` : meal.tsStart}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEAL_TYPE_COLORS[meal.mealType] ?? ""}`}
                    >
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
                      onClick={() => openEditMealForm(meal)}
                      title="Редактировать"
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
                      disabled={saveToCatalogMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <label
                      className="h-9 w-9 shrink-0 flex items-center justify-center text-muted-foreground hover:text-blue-500 cursor-pointer rounded-md hover:bg-accent transition-colors"
                      title="Прикрепить фото"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadPhotoMutation.mutate({ mealId: meal.id, file });
                        }}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirmId(meal.id)}
                      title="удалить"
                      data-testid={`btn-delete-meal-${meal.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {meal.foodText && <p className="text-sm mt-1.5 text-foreground">🍽 {meal.foodText}</p>}
                {meal.drinkText && (
                  <p className="text-sm mt-0.5 text-foreground">
                    💧 {meal.drinkText}
                    {meal.waterUnits ? (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({(meal.waterUnits * 0.5).toFixed(1)} л)
                      </span>
                    ) : null}
                  </p>
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add meal button */}
        {!showAddForm && (
          <Button className="w-full" variant="outline" onClick={openAddMealForm} data-testid="btn-add-meal">
            <Plus className="h-4 w-4 mr-2" />
            Добавить приём пищи
          </Button>
        )}

        {/* Add meal form */}
        {showAddForm && (
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">
                {isEditingMeal ? "Редактирование приёма пищи" : "Новый приём пищи"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Date field */}
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="mealDate">
                  Дата записи
                  {isEditingMeal && editingOriginalDate && form.date !== editingOriginalDate && (
                    <span className="ml-2 text-amber-600 font-normal">— запись будет перенесена в другой день</span>
                  )}
                  {form.date !== mskToday() && (
                    <span className="ml-2 text-amber-600 font-normal">— прошедший день</span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mealDate"
                    type="date"
                    value={form.date}
                    max={mskToday()}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-auto"
                    data-testid="input-meal-date"
                  />
                  {form.date !== mskToday() && (
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setForm((f) => ({ ...f, date: mskToday() }))}
                    >
                      сегодня
                    </button>
                  )}
                </div>
              </div>

              {/* Time + type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="tsStart">
                    Время начала
                  </Label>
                  <Input
                    id="tsStart"
                    type="time"
                    value={form.tsStart}
                    onChange={(e) => setForm((f) => ({ ...f, tsStart: e.target.value }))}
                    data-testid="input-ts-start"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="tsEnd">
                    Время окончания
                  </Label>
                  <Input
                    id="tsEnd"
                    type="time"
                    value={form.tsEnd}
                    onChange={(e) => setForm((f) => ({ ...f, tsEnd: e.target.value }))}
                    data-testid="input-ts-end"
                  />
                </div>
              </div>

              {!isEditingMeal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => setCatalogModalOpen(true)}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Из каталога
                </Button>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Тип приёма</Label>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mealType: t }))}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                        form.mealType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                      data-testid={`btn-meal-type-${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="foodText">
                  Что ел
                </Label>
                <Textarea
                  id="foodText"
                  rows={2}
                  placeholder="Опишите еду..."
                  value={form.foodText}
                  onChange={(e) => setForm((f) => ({ ...f, foodText: e.target.value }))}
                  data-testid="input-food-text"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="drinkText">
                    Что пил
                  </Label>
                  <Input
                    id="drinkText"
                    placeholder="Кофе, вода..."
                    value={form.drinkText}
                    onChange={(e) => setForm((f) => ({ ...f, drinkText: e.target.value }))}
                    data-testid="input-drink-text"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="waterUnits">
                    Кол-во вод (1 = 0.5 л)
                  </Label>
                  <Input
                    id="waterUnits"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    value={form.waterUnits}
                    onChange={(e) => setForm((f) => ({ ...f, waterUnits: e.target.value }))}
                    data-testid="input-water-units"
                  />
                </div>
              </div>

              {/* КБЖУ analysis button */}
              {deepseekAvailable && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                    onClick={analyzeKbju}
                    disabled={kbjuLoading || (!form.foodText && !form.drinkText)}
                    data-testid="btn-analyze-kbju"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {kbjuLoading ? "Считаю КБЖУ..." : "Рассчитать КБЖУ"}
                  </Button>

                  {kbjuResult && (
                    <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-3 py-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-orange-800 dark:text-orange-300">
                        <Flame className="h-4 w-4" />
                        {Math.round(kbjuResult.calories)} ккал
                      </div>
                      <div className="flex gap-3 text-xs text-orange-700 dark:text-orange-400">
                        <span>
                          Белки: <b>{kbjuResult.protein.toFixed(1)} г</b>
                        </span>
                        <span>
                          Жиры: <b>{kbjuResult.fat.toFixed(1)} г</b>
                        </span>
                        <span>
                          Углеводы: <b>{kbjuResult.carbs.toFixed(1)} г</b>
                        </span>
                      </div>
                      {kbjuResult.note && <p className="text-xs text-muted-foreground italic">{kbjuResult.note}</p>}
                      <p className="text-xs text-muted-foreground">Будет сохранено вместе с записью</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hunger slider */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Голод ДО приёма:{" "}
                  <span className={`font-semibold ${hungerColor(form.hungerBefore)}`}>{form.hungerBefore}</span>
                  <span className="ml-1 text-muted-foreground font-normal text-xs">
                    ({hungerLabel(form.hungerBefore).replace(/^\d+ — /, "")})
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[form.hungerBefore]}
                  onValueChange={([v]) => setForm((f) => ({ ...f, hungerBefore: v }))}
                  data-testid="slider-hunger"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 голод</span>
                  <span>5 нейтрально</span>
                  <span>10 объелся</span>
                </div>
              </div>

              {/* Satiety slider */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Насыщение ПОСЛЕ:{" "}
                  <span className={`font-semibold ${hungerColor(form.satietyAfter)}`}>{form.satietyAfter}</span>
                  <span className="ml-1 text-muted-foreground font-normal text-xs">
                    ({hungerLabel(form.satietyAfter).replace(/^\d+ — /, "")})
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[form.satietyAfter]}
                  onValueChange={([v]) => setForm((f) => ({ ...f, satietyAfter: v }))}
                  data-testid="slider-satiety"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 голод</span>
                  <span>5 нейтрально</span>
                  <span>10 объелся</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="contextNote">
                  Контекст приёма <span className="text-muted-foreground">(необязательно)</span>
                </Label>
                <Input
                  id="contextNote"
                  placeholder="Например: ел за компьютером, в спешке..."
                  value={form.contextNote}
                  onChange={(e) => setForm((f) => ({ ...f, contextNote: e.target.value }))}
                  data-testid="input-context-note"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  className="w-full sm:flex-1 h-11"
                  onClick={() =>
                    isEditingMeal && editingMealId && editingOriginalDate
                      ? updateMealMutation.mutate({ id: editingMealId, data: form, originalDate: editingOriginalDate })
                      : addMealMutation.mutate(form)
                  }
                  disabled={addMealMutation.isPending || updateMealMutation.isPending || !form.tsStart || !form.date}
                  data-testid="btn-save-meal"
                >
                  {addMealMutation.isPending || updateMealMutation.isPending
                    ? "Сохраняю..."
                    : isEditingMeal
                      ? "Сохранить изменения"
                      : "Сохранить"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-11"
                  onClick={closeMealForm}
                  data-testid="btn-cancel-meal"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ── Day Summary Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Итоги дня — {formatDate(activeDate)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Sun className="h-3 w-3" /> Подъём
                </Label>
                <Input
                  type="date"
                  value={summaryForm.wakeDate}
                  max={mskToday()}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, wakeDate: e.target.value }))}
                  data-testid="input-wake-date"
                  className="mb-1"
                />
                <Input
                  type="time"
                  value={summaryForm.wakeTime}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, wakeTime: e.target.value }))}
                  data-testid="input-wake-time"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Moon className="h-3 w-3" /> Отбой
                </Label>
                <Input
                  type="date"
                  value={summaryForm.sleepDate}
                  max={addDays(activeDate, 1)}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, sleepDate: e.target.value }))}
                  data-testid="input-sleep-date"
                  className="mb-1"
                />
                <Input
                  type="time"
                  value={summaryForm.sleepTime}
                  onChange={(e) => {
                    const sleepTime = e.target.value;
                    setSummaryForm((f) => ({
                      ...f,
                      sleepTime,
                      sleepDate: inferSleepDate(activeDate, sleepTime) ?? f.sleepDate,
                    }));
                  }}
                  data-testid="input-sleep-time"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Activity className="h-3 w-3" /> Спорт / активность
              </Label>
              <Input
                placeholder='Например: йога 30 мин, или "нет"'
                value={summaryForm.sportActivity}
                onChange={(e) => setSummaryForm((f) => ({ ...f, sportActivity: e.target.value }))}
                data-testid="input-sport"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Footprints className="h-3 w-3" /> Шаги за день
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={summaryForm.steps}
                onChange={(e) => setSummaryForm((f) => ({ ...f, steps: e.target.value }))}
                data-testid="input-steps"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Комментарий дня <span className="text-muted-foreground">(самочувствие, контекст)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Как прошёл день, настроение, самочувствие..."
                value={summaryForm.dayComment}
                onChange={(e) => setSummaryForm((f) => ({ ...f, dayComment: e.target.value }))}
                data-testid="input-day-comment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSummaryDialog(false);
                setPendingDownloadDate(null);
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={() => saveSummaryMutation.mutate()}
              disabled={saveSummaryMutation.isPending}
              data-testid="btn-save-summary"
            >
              {saveSummaryMutation.isPending
                ? "Сохраняю..."
                : pendingDownloadDate
                  ? "Сохранить и скачать"
                  : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Удалить запись?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMealMutation.mutate(deleteConfirmId)}
              disabled={deleteMealMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Onboarding tour */}
      <OnboardingTour step={tourStep} active={tourActive} onNext={tourNext} onSkip={tourSkip} />

      {/* Bottom navigation (mobile only) */}
      <FoodCatalogModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        onSelect={(item) => {
          // Fill form with catalog item data
          const totalKcal = item.entries.reduce((s: number, e: any) => s + (e.kcal ?? 0), 0);
          const totalProtein = item.entries.reduce((s: number, e: any) => s + (e.protein ?? 0), 0);
          const totalFat = item.entries.reduce((s: number, e: any) => s + (e.fat ?? 0), 0);
          const totalCarbs = item.entries.reduce((s: number, e: any) => s + (e.carbs ?? 0), 0);
          const foodText = item.entries.map((e: any) => e.mealName).join(", ") || item.name;
          setForm((f) => ({
            ...f,
            foodText,
            calories: totalKcal || undefined,
            protein: totalProtein || undefined,
            fat: totalFat || undefined,
            carbs: totalCarbs || undefined,
          }));
        }}
      />
      <BottomNav isAdmin={user?.role === "admin"} isDoctor={user?.role === "doctor"} currentPath={location} />

      {/* ── Report range dialog (Phase 21) ──────────────────────────────────── */}
      <Dialog open={showRangeDialog} onOpenChange={setShowRangeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Отчёт за период</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">С</Label>
              <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">По</Label>
              <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRangeDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                setShowRangeDialog(false);
                downloadRangeReport(rangeFrom, rangeTo);
              }}
            >
              Скачать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Profile questionnaire (Phase 17) ────────────────────────────────── */}
      <ProfileQuestionnaire open={showProfileDialog} onClose={() => setShowProfileDialog(false)} />

      {/* PWA install prompt */}
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
