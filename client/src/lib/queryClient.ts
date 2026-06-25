import { QueryClient } from "@tanstack/react-query";

// Rewrite API calls to use the proxy port in deployed environments
const API_BASE =
  typeof window !== "undefined" && (window as any).__PORT_5000__
    ? (window as any).__PORT_5000__
    : "";

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// Default query function
async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const path = queryKey[0] as string;
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
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
