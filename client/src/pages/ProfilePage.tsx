/**
 * ProfilePage — страница профиля пользователя.
 * Разделы:
 *   1. Основные данные (отображаемое имя)
 *   2. Сброс пароля (через письмо на email)
 *   3. Последний вход и дата регистрации
 *   4. Анкета (HealthProfile / ProfileQuestionnaire)
 *   5. Профиль врача (только для роли doctor/admin)
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Lock,
  Clock,
  ClipboardList,
  Stethoscope,
  ArrowLeft,
  Save,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";

async function api(method: string, path: string, body?: unknown) {
  const res = await apiRequest(method, path, body);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/App";
import { ProfileQuestionnaire } from "@/components/ProfileQuestionnaire";
import { BottomNav } from "@/components/BottomNav";
import { useLocation } from "wouter";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatDt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MeResponse {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  role: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface Doctor {
  id: number;
  fullName: string;
  phone?: string | null;
  telegramUrl?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useAppTheme();
  const [location] = useLocation();

  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // ── Fetch full me (with lastLoginAt) ─────────────────────────────────────
  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: () => api("GET", "/api/auth/me"),
  });

  // ── Display name form ─────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (me?.displayName) setDisplayName(me.displayName);
  }, [me?.displayName]);

  const saveName = useMutation({
    mutationFn: () => api("PUT", "/api/profile", { displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Имя обновлено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Password reset ────────────────────────────────────────────────────────
  const [resetSent, setResetSent] = useState(false);
  const sendReset = useMutation({
    mutationFn: () => api("POST", "/api/auth/forgot-password", { email: me?.email }),
    onSuccess: () => {
      setResetSent(true);
      toast({ title: "Письмо отправлено", description: `Проверьте ${me?.email}` });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Doctor profile ────────────────────────────────────────────────────────
  const isDoctor = user?.role === "doctor";
  const canUseMfa = user?.role === "doctor" || user?.role === "admin";

  // MFA state
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaTokenInput, setMfaTokenInput] = useState("");
  const [mfaSetupStep, setMfaSetupStep] = useState<"idle" | "scan" | "disable">("idle");

  const { data: mfaStatus, refetch: refetchMfa } = useQuery<{ mfaEnabled: boolean; canEnable: boolean }>({
    queryKey: ["/api/auth/mfa/status"],
    enabled: canUseMfa,
  });

  const startMfaSetup = useMutation({
    mutationFn: () => api("POST", "/api/auth/mfa/setup"),
    onSuccess: (data: any) => {
      setMfaQr(data.qrDataUrl);
      setMfaSetupStep("scan");
      setMfaTokenInput("");
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const confirmMfaSetup = useMutation({
    mutationFn: () => api("POST", "/api/auth/mfa/verify-setup", { token: mfaTokenInput }),
    onSuccess: () => {
      setMfaSetupStep("idle");
      setMfaQr(null);
      refetchMfa();
      toast({ title: "MFA включена" });
    },
    onError: (e: any) => toast({ title: "Неверный код", description: e.message, variant: "destructive" }),
  });

  const disableMfa = useMutation({
    mutationFn: () => api("POST", "/api/auth/mfa/disable", { token: mfaTokenInput }),
    onSuccess: () => {
      setMfaSetupStep("idle");
      refetchMfa();
      toast({ title: "MFA отключена" });
    },
    onError: (e: any) => toast({ title: "Неверный код", description: e.message, variant: "destructive" }),
  });
  const { data: doctorData } = useQuery<{ doctor: Doctor | null }>({
    queryKey: ["/api/doctor/profile"],
    queryFn: () => api("GET", "/api/doctor/profile"),
    enabled: isDoctor,
  });

  const [doctorForm, setDoctorForm] = useState({ fullName: "", phone: "", telegramUrl: "" });
  useEffect(() => {
    if (doctorData?.doctor) {
      setDoctorForm({
        fullName: doctorData.doctor.fullName ?? "",
        phone: doctorData.doctor.phone ?? "",
        telegramUrl: doctorData.doctor.telegramUrl ?? "",
      });
    }
  }, [doctorData?.doctor]);

  const saveDoctor = useMutation({
    mutationFn: () => api("PUT", "/api/doctor/profile", doctorForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
      toast({ title: "Профиль врача сохранён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href="#/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Дневник</span>
            </a>
            <span className="text-muted-foreground/40 hidden sm:inline">|</span>
            <User className="h-4 w-4 text-primary" />
            <h1 className="font-semibold text-base">Профиль</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={toggleTheme}
              title={isDark ? "Светлая тема" : "Тёмная тема"}
              aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти" aria-label="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ── Account info ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> Аккаунт
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Логин</span>
              <span className="font-medium">@{me?.username ?? "..."}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{me?.email ?? "..."}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Роль</span>
              <span className="font-medium capitalize">{me?.role ?? "..."}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Регистрация</span>
              <span className="font-medium">{formatDt(me?.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Последний вход</span>
              <span className="font-medium">{meLoading ? "..." : formatDt(me?.lastLoginAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Display name ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" /> Отображаемое имя
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground">
              Отображается в дневнике и у врача. Можно указать полное имя.
            </p>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="h-9 text-sm"
                maxLength={64}
              />
              <Button
                size="sm"
                className="shrink-0"
                disabled={saveName.isPending || !displayName.trim()}
                onClick={() => saveName.mutate()}
              >
                <Save className="h-4 w-4 mr-1" />
                {saveName.isPending ? "..." : "Сохранить"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Password reset ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" /> Смена пароля
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground">
              На адрес <span className="font-medium text-foreground">{me?.email}</span> будет отправлена ссылка для
              сброса пароля.
            </p>
            {resetSent ? (
              <p className="text-sm text-green-600 dark:text-green-400">Письмо отправлено. Проверьте почту.</p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={sendReset.isPending || !me?.email}
                onClick={() => sendReset.mutate()}
              >
                {sendReset.isPending ? "Отправка..." : "Отправить ссылку для сброса"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Health questionnaire ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" /> Анкета здоровья
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Рост, вес, активность, цель — используется для расчёта КБЖУ-ориентиров.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowQuestionnaire(true)}
            >
              <ClipboardList className="h-4 w-4" />
              Открыть анкету
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* ── MFA (Phase 28.2, only for doctor/admin) ── */}
        {canUseMfa && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Двухфакторная аутентификация (MFA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Статус</span>
                <span
                  className={
                    mfaStatus?.mfaEnabled ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
                  }
                >
                  {mfaStatus?.mfaEnabled ? "Включена" : "Отключена"}
                </span>
              </div>

              {mfaSetupStep === "idle" && !mfaStatus?.mfaEnabled && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => startMfaSetup.mutate()}
                  disabled={startMfaSetup.isPending}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {startMfaSetup.isPending ? "Генерация QR..." : "Включить MFA"}
                </Button>
              )}

              {mfaSetupStep === "scan" && mfaQr && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Отсканируйте QR-код в Google Authenticator или Authy, затем введите код для подтверждения.
                  </p>
                  <img src={mfaQr} alt="MFA QR-код" className="rounded-lg border mx-auto w-48 h-48" />
                  <div className="space-y-1">
                    <Label className="text-xs">Код из приложения</Label>
                    <Input
                      value={mfaTokenInput}
                      onChange={(e) => setMfaTokenInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="h-9 text-sm font-mono tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setMfaSetupStep("idle")}>
                      Отмена
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => confirmMfaSetup.mutate()}
                      disabled={mfaTokenInput.length !== 6 || confirmMfaSetup.isPending}
                    >
                      {confirmMfaSetup.isPending ? "Проверка..." : "Подтвердить"}
                    </Button>
                  </div>
                </div>
              )}

              {mfaSetupStep === "idle" && mfaStatus?.mfaEnabled && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Для отключения введите текущий код MFA.</p>
                  {mfaSetupStep === "idle" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => {
                        setMfaSetupStep("disable");
                        setMfaTokenInput("");
                      }}
                    >
                      <ShieldOff className="h-4 w-4 mr-2" /> Отключить MFA
                    </Button>
                  )}
                </div>
              )}

              {mfaSetupStep === "disable" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Код MFA для подтверждения</Label>
                    <Input
                      value={mfaTokenInput}
                      onChange={(e) => setMfaTokenInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="h-9 text-sm font-mono tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setMfaSetupStep("idle")}>
                      Отмена
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => disableMfa.mutate()}
                      disabled={mfaTokenInput.length !== 6 || disableMfa.isPending}
                    >
                      {disableMfa.isPending ? "Отключение..." : "Отключить"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Doctor profile (only for doctor/admin) ── */}
        {isDoctor && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Stethoscope className="h-4 w-4" /> Профиль врача
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <p className="text-xs text-muted-foreground">Эти данные видны пациентам в кабинете врача.</p>
              <div className="space-y-1">
                <Label className="text-xs">ФИО врача *</Label>
                <Input
                  value={doctorForm.fullName}
                  onChange={(e) => setDoctorForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Краснова Мария Ивановна"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Телефон</Label>
                <Input
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (900) 000-00-00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telegram</Label>
                <Input
                  value={doctorForm.telegramUrl}
                  onChange={(e) => setDoctorForm((f) => ({ ...f, telegramUrl: e.target.value }))}
                  placeholder="https://t.me/username"
                  className="h-9 text-sm"
                />
              </div>
              <Button
                className="w-full"
                size="sm"
                disabled={!doctorForm.fullName || saveDoctor.isPending}
                onClick={() => saveDoctor.mutate()}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveDoctor.isPending ? "Сохранение..." : "Сохранить профиль врача"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />

      <ProfileQuestionnaire open={showQuestionnaire} onClose={() => setShowQuestionnaire(false)} />
    </div>
  );
}
