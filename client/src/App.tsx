import { lazy, Suspense, createContext, useContext } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "@/hooks/useTheme";
import DiaryPage from "@/pages/DiaryPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PrivacyPage from "@/pages/PrivacyPage";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/Footer";

// ── Theme context ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: "light" | "dark";
  toggle: () => void;
  toggleTheme: () => void;
  isDark: boolean;
}
const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
  toggleTheme: () => {},
  isDark: false,
});
export const useAppTheme = () => useContext(ThemeContext);

// ── Lazy pages ────────────────────────────────────────────────────────────────
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const DoctorPage = lazy(() => import("@/pages/DoctorPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));

// ── Page transition wrapper ───────────────────────────────────────────────────
function PageFade({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in" style={{ animation: "pageFadeIn 0.18s ease-out both" }}>
      {children}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img src="/favicon-32x32.png" alt="" className="w-8 h-8 opacity-60 animate-pulse" />
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Доступ запрещён</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Админ-панель доступна только пользователям с ролью admin.
          </p>
          <a href="#/" className="mt-4 inline-block text-sm text-primary underline">
            Вернуться в дневник
          </a>
        </div>
      </div>
    );
  }
  return <AdminPage />;
}

function DoctorRoute() {
  const { user } = useAuth();
  if (user?.role !== "doctor" && user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Кабинет врача доступен только пользователям с ролью doctor.</p>
      </div>
    );
  }
  return (
    <Suspense fallback={null}>
      <DoctorPage />
    </Suspense>
  );
}

function AnimatedRoutes() {
  const [location] = useLocation();

  return (
    <>
      <PageFade key={location}>
        <Switch>
          <Route path="/" component={DiaryPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/admin" component={AdminRoute} />
          <Route path="/doctor" component={DoctorRoute} />
          <Route path="/about" component={AboutPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route component={NotFound} />
        </Switch>
      </PageFade>
      <Footer />
    </>
  );
}

function Routes() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route component={AuthPage} />
        </Switch>
      </Router>
    );
  }

  return (
    <Router hook={useHashLocation}>
      <Suspense fallback={<PageLoader />}>
        <AnimatedRoutes />
      </Suspense>
    </Router>
  );
}

export default function App() {
  const themeValue = useTheme();

  return (
    <ThemeContext.Provider value={{ ...themeValue, toggleTheme: themeValue.toggle }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}
