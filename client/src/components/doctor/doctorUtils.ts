import { apiRequest } from "@/lib/queryClient";

export function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function apiCall(path: string, opts?: RequestInit) {
  const method = (opts?.method ?? "GET") as string;
  const body = opts?.body as string | undefined;
  const res = await apiRequest(method, path, body ? JSON.parse(body) : undefined);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}
