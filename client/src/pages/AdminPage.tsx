import { useState } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  AuditLogTab,
  AdminSessionsTable,
  AdminUsersTable,
  ClientErrorsTab,
  DeepSeekUsagePanel,
  S3AdminPanel,
} from "@/components/admin";
import { LogOut, Shield, ArrowLeft, Users, ScrollText, AlertTriangle } from "lucide-react";

type AdminTab = "users" | "audit" | "errors";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [tab, setTab] = useState<AdminTab>("users");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base">Админ-панель</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href="#/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Дневник
              </a>
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.username}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 pb-24 sm:pb-4">
        <div className="flex gap-2 border-b">
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "users"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("users")}
            data-testid="tab-admin-users"
          >
            <Users className="h-4 w-4" />
            Пользователи
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "audit"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("audit")}
            data-testid="tab-admin-audit"
          >
            <ScrollText className="h-4 w-4" />
            Журнал
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "errors"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("errors")}
            data-testid="tab-admin-errors"
          >
            <AlertTriangle className="h-4 w-4" />
            Ошибки
          </button>
        </div>

        {tab === "audit" && <AuditLogTab />}
        {tab === "errors" && <ClientErrorsTab />}

        {tab === "users" && (
          <>
            <DeepSeekUsagePanel />
            <S3AdminPanel />
            <AdminUsersTable />
            <AdminSessionsTable />
          </>
        )}
      </main>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />
    </div>
  );
}
