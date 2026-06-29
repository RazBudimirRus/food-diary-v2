import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest, queryClient, refreshAccessToken, setAccessToken, setUnauthorizedHandler } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  role: "user" | "admin" | "doctor";
}

interface AuthCtx {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  register(username: string, email: string, password: string, displayName?: string): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function rememberSession(token: string | null, nextUser: AuthUser | null) {
    setAccessToken(token);
    setAccessTokenState(token);
    setUser(nextUser);
    if (!token) queryClient.clear();
  }

  // On mount — use httpOnly refresh cookie to mint a new in-memory access token.
  useEffect(() => {
    setUnauthorizedHandler(() => rememberSession(null, null));
    refreshAccessToken(false)
      .then((data) => {
        if (data) {
          rememberSession(data.accessToken, data.user as AuthUser);
        }
      })
      .finally(() => setLoading(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(username: string, password: string) {
    const r = await apiRequest("POST", "/api/auth/login", { username, password });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error ?? "Ошибка входа");
    }
    const data = await r.json();
    rememberSession(data.accessToken, data.user);
  }

  async function register(username: string, email: string, password: string, displayName?: string) {
    // pdConsent checkbox is validated in AuthPage before calling register
    const r = await apiRequest("POST", "/api/auth/register", {
      username,
      email,
      password,
      displayName,
      pdConsent: true,
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error ?? "Ошибка регистрации");
    }
    const data = await r.json();
    rememberSession(data.accessToken, data.user);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    rememberSession(null, null);
  }

  return (
    <Ctx.Provider value={{ user, accessToken: accessTokenState, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
