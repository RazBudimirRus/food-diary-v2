// DiaryHeader.tsx — top app bar: logo, nav/action buttons (analytics, admin,
// doctor cabinet, profile, report download, theme toggle, logout, mobile menu)
// plus the DateCarousel row. Extracted from DiaryPage.tsx during the 29.4
// refactor to keep the page component within the line budget.
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  LogOut,
  MoreVertical,
  BarChart3,
  Shield,
  HelpCircle,
  ClipboardList,
  Sun,
  Moon,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import { formatDate } from "@/lib/diary-utils";
import { DateCarousel } from "@/components/diary/DateCarousel";

interface DiaryHeaderProps {
  activeDate: string;
  isToday: boolean;
  userRole: string | undefined;
  userLabel: string | undefined;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  onTriggerTour: () => void;
  onOpenProfile: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onDownloadDay: () => void;
  onDownloadWeek: () => void;
  onOpenRangeDialog: () => void;
}

export function DiaryHeader({
  activeDate,
  isToday,
  userRole,
  userLabel,
  theme,
  onToggleTheme,
  onLogout,
  onTriggerTour,
  onOpenProfile,
  onPrevDay,
  onNextDay,
  onDownloadDay,
  onDownloadWeek,
  onOpenRangeDialog,
}: DiaryHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
      <div className="max-w-2xl mx-auto px-4 py-2 flex flex-col gap-1">
        {/* Row 1: logo (left) + action buttons (right) */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 shrink-0">
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
            <Button size="sm" variant="outline" className="hidden sm:flex" asChild data-testid="link-analytics">
              <a href="#/analytics">
                <BarChart3 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Аналитика</span>
              </a>
            </Button>
            {(userRole === "doctor" || userRole === "admin") && (
              <a
                href="#/doctor"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Stethoscope className="h-4 w-4" />
                Кабинет врача
              </a>
            )}
            {userRole === "admin" && (
              <Button size="sm" variant="outline" className="hidden sm:flex" asChild data-testid="link-admin">
                <a href="#/admin">
                  <Shield className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Админ</span>
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" className="hidden sm:flex" asChild>
              <a href="#/profile">
                <UserCircle className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Профиль</span>
              </a>
            </Button>
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
                <DropdownMenuItem onClick={onDownloadDay}>За день ({formatDate(activeDate)})</DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadWeek}>За текущую неделю</DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenRangeDialog}>За период…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hidden sm:flex"
              onClick={onOpenProfile}
              title="Моя анкета"
              data-testid="btn-open-profile"
            >
              <ClipboardList className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{userLabel}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              data-testid="btn-toggle-theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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
                {userRole === "admin" && (
                  <DropdownMenuItem asChild>
                    <a href="#/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Админ
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onOpenProfile} className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Моя анкета
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTriggerTour} className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" /> Показать подсказки
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hidden sm:flex"
              onClick={onLogout}
              title="Выйти"
              data-testid="btn-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Row 2: date navigation (centered) */}
        <DateCarousel date={activeDate} onPrev={onPrevDay} onNext={onNextDay} isToday={isToday} />
      </div>
    </header>
  );
}
