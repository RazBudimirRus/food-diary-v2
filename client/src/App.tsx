import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import DiaryPage from "@/pages/DiaryPage";
import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";

function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Доступ запрещён</h1>
          <p className="mt-2 text-sm text-muted-foreground">Админ-панель доступна только пользователям с ролью admin.</p>
          <a href="#/" className="mt-4 inline-block text-sm text-primary underline">Вернуться в дневник</a>
        </div>
      </div>
    );
  }
  return <AdminPage />;
}

function Routes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={DiaryPage} />
        <Route path="/admin" component={AdminRoute} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
