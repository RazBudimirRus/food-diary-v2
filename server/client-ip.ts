import type { Request } from "express";

function headerValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

/** Real client IP: Cloudflare CF-Connecting-IP, then X-Forwarded-For, then Express req.ip. */
export function getClientIp(req: Pick<Request, "ip" | "headers" | "socket">): string {
  const cfIp = headerValue(req.headers["cf-connecting-ip"]);
  if (cfIp) return cfIp;

  const forwarded = headerValue(req.headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return req.ip || req.socket.remoteAddress || "0.0.0.0";
}
