import { storage } from "./storage";
import type { AuthRequest } from "./auth";

/**
 * Phase 24 — Audit Log helper.
 * Записывает действие актора (admin/doctor) в audit_log.
 * Никогда не должен прерывать основной запрос — ошибки записи логируются молча.
 */
export async function auditLog(
  req: AuthRequest,
  action: string,
  targetId?: number,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await storage.addAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action,
      targetId: targetId ?? null,
      detail: detail ? JSON.stringify(detail) : null,
      ip: req.ip ?? null,
      userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
    });
  } catch {
    // не прерываем основной запрос
  }
}
