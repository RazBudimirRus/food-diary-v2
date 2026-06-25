import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  register(username: string, email: string, password: string, displayName?: string): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — try to restore session from cookie (server-side httpOnly)
  useEffect(() => {
    apiRequest("GET", "/api/auth/me").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setUser(data);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const r = await apiRequest("POST", "/api/auth/login", { username, password });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error ?? "Ошибка входа");
    }
    const data = await r.json();
    setUser(data.user);
    setToken(data.token);
  }

  async function register(username: string, email: string, password: string, displayName?: string) {
    const r = await apiRequest("POST", "/api/auth/register", { username, email, password, displayName });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error ?? "Ошибка регистрации");
    }
    const data = await r.json();
    setUser(data.user);
    setToken(data.token);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    setToken(null);
  }

  return <Ctx.Provider value={{ user, token, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
