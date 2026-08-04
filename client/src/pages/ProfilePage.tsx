/**
 * ProfilePage — страница профиля пользователя.
 * Разделы:
 *   1. Основные данные (отображаемое имя)
 *   2. Сброс пароля (через письмо на email)
 *   3. Последний вход и дата регистрации
 *   4. Анкета (HealthProfile / ProfileQuestionnaire)
 *   5. Профиль врача (только для роли doctor/admin)
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, ClipboardList, ArrowLeft, ChevronRight, LogOut, Moon, Sun, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme-context";
import { ProfileQuestionnaire } from "@/components/ProfileQuestionnaire";
import { BottomNav } from "@/components/BottomNav";
import { useLocation } from "wouter";
import {
  AccountInfoCard,
  DisplayNameCard,
  PasswordResetCard,
  MfaCard,
  DoctorProfileCard,
  profileApi,
} from "@/components/profile";
import type { MeResponse, MfaStatus } from "@/components/profile";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useAppTheme();
  const [location] = useLocation();

  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: () => profileApi("GET", "/api/auth/me"),
  });

  const isDoctor = user?.role === "doctor";
  const canUseMfa = user?.role === "doctor" || user?.role === "admin";

  const { data: mfaStatus, refetch: refetchMfa } = useQuery<MfaStatus>({
    queryKey: ["/api/auth/mfa/status"],
    enabled: canUseMfa,
  });

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
        <AccountInfoCard me={me} meLoading={meLoading} />
        <DisplayNameCard me={me} />
        <PasswordResetCard me={me} />

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

        {/* ── Food Catalog ── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" /> Каталог блюд
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              База ваших продуктов и шаблонов блюд. Добавляйте еду вручную с расчётом КБЖУ, чтобы быстро выбирать при
              записи приёма.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => window.location.assign("#/catalog")}
            >
              <BookOpen className="h-4 w-4" />
              Открыть каталог
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {canUseMfa && <MfaCard mfaStatus={mfaStatus} refetchMfa={refetchMfa} />}
        {isDoctor && <DoctorProfileCard />}
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
