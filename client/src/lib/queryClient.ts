import { QueryClient } from "@tanstack/react-query";

// Rewrite API calls to use the proxy port in deployed environments
const API_BASE =
  typeof window !== "undefined" && (window as any).__PORT_5000__
    ? (window as any).__PORT_5000__
    : "";

let accessToken: string | null = null;
let refreshPromise: Promise<AuthRefreshResult | null> | null = null;
let onUnauthorized: (() => void) | null = null;

interface AuthRefreshResult {
  accessToken: string;
  user: unknown;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function shouldTryRefresh(path: string) {
  return ![
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/refresh",
  ].includes(path);
}

export async function refreshAccessToken(notifyOnFailure = true): Promise<AuthRefreshResult | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          setAccessToken(null);
          if (notifyOnFailure) onUnauthorized?.();
          return null;
        }
        const data = await res.json() as AuthRefreshResult;
        setAccessToken(data.accessToken);
        return data;
      })
      .catch(() => {
        setAccessToken(null);
        if (notifyOnFailure) onUnauthorized?.();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const headers: HeadersInit = body ? { "Content-Type": "application/json" } : {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (res.status !== 401 || !shouldTryRefresh(path)) return res;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return res;

  const retryHeaders: HeadersInit = body ? { "Content-Type": "application/json" } : {};
  retryHeaders.Authorization = `Bearer ${refreshed.accessToken}`;
  return fetch(url, {
    method,
    headers: retryHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

// Default query function
async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const path = queryKey[0] as string;
  const res = await apiRequest("GET", path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
    },
  },
});

export { API_BASE };
