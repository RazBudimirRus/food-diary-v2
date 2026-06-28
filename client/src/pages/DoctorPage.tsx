/**
 * DoctorPage — Фаза 15.
 * Кабинет врача: профиль, список пациентов, просмотр дневника пациента.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Users, BookOpen, ChevronLeft, Bell, UserPlus, Trash2, Flame, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Meal {
  id: number;
  mealType: string;
  tsStart: string;
  tsEnd?: string;
  foodText?: string;
  drinkText?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  contextNote?: string;
}

interface Patient {
  user: { id: number; username: string; displayName?: string; email: string };
  assignedAt: string;
}

interface Doctor {
  id: number;
  fullName: string;
  phone?: string;
  telegramUrl?: string;
}

type Tab = "patients" | "diary" | "profile";

function apiCall(path: string, opts?: RequestInit) {
  return fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  });
}

export default function DoctorPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("patients");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");

  // ── Profile form ──────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "", telegramUrl: "" });

  const { data: doctorData } = useQuery<{ doctor: Doctor | null }>({
    queryKey: ["/api/doctor/profile"],
    onSuccess: (d) => {
      if (d.doctor) {
        setProfileForm({
          fullName: d.doctor.fullName,
          phone: d.doctor.phone ?? "",
          telegramUrl: d.doctor.telegramUrl ?? "",
        });
      }
    },
  });

  const saveProfile = useMutation({
    mutationFn: () => apiCall("/api/doctor/profile", { method: "PUT", body: JSON.stringify(profileForm) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
      toast({ title: "Профиль сохранён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Patients ──────────────────────────────────────────────────────────────
  const { data: patientsData, isLoading: patientsLoading } = useQuery<{ patients: Patient[] }>({
    queryKey: ["/api/doctor/patients"],
    enabled: tab === "patients" || tab === "diary",
  });
  const patients = patientsData?.patients ?? [];

  const [assignQuery, setAssignQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; displayName?: string }[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const searchUser = async () => {
    setSearchError(null);
    setAssignError(null);
    const q = assignQuery.trim();
    if (q.length < 2) {
      setSearchError("Введите минимум 2 символа для поиска");
      return;
    }
    try {
      const r = await apiCall(`/api/doctor/search-users?q=${encodeURIComponent(q)}`);
      setSearchResults(r.users ?? []);
      setSearchDone(true);
      if ((r.users ?? []).length === 0) {
        setSearchError("Пользователи не найдены. Проверьте имя пользователя или отображаемое имя.");
      }
    } catch (e: any) {
      setSearchError(e.message || "Ошибка поиска. Попробуйте ещё раз.");
    }
  };

  const assign = useMutation({
    mutationFn: (patientId: number) => apiCall(`/api/doctor/patients/${patientId}/assign`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/patients"] });
      setAssignQuery("");
      setSearchDone(false);
      setSearchResults([]);
      setAssignError(null);
      toast({ title: "Пациент привязан" });
    },
    onError: (e: Error) => setAssignError(e.message),
  });

  const removePatient = useMutation({
    mutationFn: (patientId: number) => apiCall(`/api/doctor/patients/${patientId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/patients"] });
      if (selectedPatient) setSelectedPatient(null);
      toast({ title: "Пациент откреплён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Patient diary ─────────────────────────────────────────────────────────
  const { data: diaryData, isLoading: diaryLoading } = useQuery<{ day: any; meals: Meal[] }>({
    queryKey: ["/api/doctor/patients", selectedPatient?.user.id, "diary", diaryDate],
    queryFn: () => apiCall(`/api/doctor/patients/${selectedPatient!.user.id}/diary?date=${diaryDate}`),
    enabled: !!selectedPatient && tab === "diary",
  });

  // ── Notify patient ────────────────────────────────────────────────────────
  const notify = useMutation({
    mutationFn: (patientId: number) =>
      apiCall(`/api/doctor/patients/${patientId}/notify`, {
        method: "POST",
        body: JSON.stringify({ title: notifyTitle, body: notifyBody }),
      }),
    onSuccess: (d) => toast({ title: `Отправлено: ${d.sent} уведомлений` }),
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-base">Кабинет врача</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1 mb-4 border rounded-lg p-1 bg-muted/40">
          {(["patients", "diary", "profile"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "patients" ? "Пациенты" : t === "diary" ? "Дневник" : "Профиль"}
            </button>
          ))}
        </div>

        {/* ── Patients tab ── */}
        {tab === "patients" && (
          <div className="space-y-4">
            {/* Assign new patient */}
            <Card>
              <CardContent className="px-4 py-3 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Привязать пациента
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Имя пользователя или отображаемое имя"
                    value={assignQuery}
                    onChange={(e) => {
                      setAssignQuery(e.target.value);
                      setSearchDone(false);
                      setSearchError(null);
                      setAssignError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && searchUser()}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={searchUser} className="shrink-0">
                    Найти
                  </Button>
                </div>
                {searchError && <p className="text-sm text-destructive">{searchError}</p>}
                {assignError && <p className="text-sm text-destructive">{assignError}</p>}
                {searchDone && searchResults.length > 0 && (
                  <div className="space-y-1">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <span className="text-sm">
                          {u.displayName || u.username}{" "}
                          <span className="text-muted-foreground text-xs">@{u.username}</span>
                        </span>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => assign.mutate(u.id)}
                          disabled={assign.isPending}
                        >
                          {assign.isPending ? "..." : "Привязать"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patient list */}
            <div className="space-y-2">
              {patientsLoading && <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>}
              {!patientsLoading && patients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Нет привязанных пациентов</p>
              )}
              {patients.map((p) => (
                <Card key={p.user.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                  <CardContent className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{p.user.displayName || p.user.username}</p>
                      <p className="text-xs text-muted-foreground">@{p.user.username}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedPatient(p);
                          setTab("diary");
                        }}
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1" /> Дневник
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removePatient.mutate(p.user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Diary tab ── */}
        {tab === "diary" && (
          <div className="space-y-3">
            {/* Patient selector */}
            <div className="flex gap-2 items-center">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={selectedPatient?.user.id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const p = patients.find((pt) => pt.user.id === id) ?? null;
                  setSelectedPatient(p);
                }}
              >
                <option value="">— Выберите пациента —</option>
                {patients.map((p) => (
                  <option key={p.user.id} value={p.user.id}>
                    {p.user.displayName || p.user.username}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                className="h-9 w-36 shrink-0 text-sm"
                value={diaryDate}
                onChange={(e) => setDiaryDate(e.target.value)}
              />
            </div>

            {selectedPatient && (
              <>
                {diaryLoading && <p className="text-sm text-muted-foreground text-center py-6">Загрузка...</p>}
                {!diaryLoading && !diaryData?.meals?.length && (
                  <p className="text-sm text-muted-foreground text-center py-6">Нет записей за этот день</p>
                )}
                {diaryData?.meals?.map((meal) => (
                  <Card key={meal.id}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {meal.tsEnd && meal.tsEnd !== meal.tsStart ? `${meal.tsStart}–${meal.tsEnd}` : meal.tsStart}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {meal.mealType}
                        </Badge>
                      </div>
                      {meal.foodText && <p className="text-sm mt-1.5">🍽 {meal.foodText}</p>}
                      {meal.drinkText && <p className="text-sm mt-0.5">💧 {meal.drinkText}</p>}
                      {meal.calories != null && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-md px-2 py-1 w-fit">
                          <Flame className="h-3 w-3" />
                          <span>{Math.round(meal.calories)} ккал</span>
                          {meal.protein != null && <span>· Б {meal.protein?.toFixed(1)}</span>}
                          {meal.fat != null && <span>· Ж {meal.fat?.toFixed(1)}</span>}
                          {meal.carbs != null && <span>· У {meal.carbs?.toFixed(1)}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Notify block */}
                <Card>
                  <CardContent className="px-4 py-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Уведомление пациенту
                    </p>
                    <Input
                      placeholder="Заголовок"
                      value={notifyTitle}
                      onChange={(e) => setNotifyTitle(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Textarea
                      placeholder="Текст (необязательно)"
                      value={notifyBody}
                      onChange={(e) => setNotifyBody(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                    <Button
                      size="sm"
                      disabled={!notifyTitle || notify.isPending}
                      onClick={() => notify.mutate(selectedPatient.user.id)}
                    >
                      {notify.isPending ? "Отправка..." : "Отправить"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <Card>
            <CardContent className="px-4 py-3 space-y-3">
              <p className="text-sm font-medium">Профиль врача</p>
              <div className="space-y-1">
                <Label className="text-xs">ФИО *</Label>
                <Input
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Иванов Иван Иванович"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Телефон</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (900) 000-00-00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telegram</Label>
                <Input
                  value={profileForm.telegramUrl}
                  onChange={(e) => setProfileForm((f) => ({ ...f, telegramUrl: e.target.value }))}
                  placeholder="https://t.me/username"
                  className="h-9 text-sm"
                />
              </div>
              <Button
                className="w-full"
                disabled={!profileForm.fullName || saveProfile.isPending}
                onClick={() => saveProfile.mutate()}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveProfile.isPending ? "Сохранение..." : "Сохранить профиль"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
