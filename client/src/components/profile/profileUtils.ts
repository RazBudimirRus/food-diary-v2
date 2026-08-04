import { apiRequest } from "@/lib/queryClient";

export async function profileApi(method: string, path: string, body?: unknown) {
  const res = await apiRequest(method, path, body);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}

export function formatDt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
