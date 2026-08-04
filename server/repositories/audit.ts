import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { auditLog, type AuditLogEntry, type NewAuditLogEntry } from "@shared/schema";
import { db } from "../db";

export class AuditRepository {
  async addAuditLog(data: Omit<NewAuditLogEntry, "id" | "createdAt">): Promise<void> {
    db.insert(auditLog)
      .values({
        actorId: data.actorId,
        actorRole: data.actorRole,
        action: data.action,
        targetId: data.targetId ?? null,
        detail: data.detail ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      })
      .run();
  }

  async getAuditLog(filters: {
    actorId?: number;
    targetId?: number;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const conditions: SQL[] = [];
    if (filters.actorId !== undefined) conditions.push(eq(auditLog.actorId, filters.actorId));
    if (filters.targetId !== undefined) conditions.push(eq(auditLog.targetId, filters.targetId));
    if (filters.action !== undefined) conditions.push(eq(auditLog.action, filters.action));
    if (filters.from !== undefined) conditions.push(gte(auditLog.createdAt, filters.from));
    if (filters.to !== undefined) conditions.push(lte(auditLog.createdAt, filters.to));

    const limit = filters.limit ?? 100;
    return db
      .select()
      .from(auditLog)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .all();
  }
}

export const auditRepository = new AuditRepository();
