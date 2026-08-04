import { eq } from "drizzle-orm";
import {
  apiUsage,
  passwordResetTokens,
  refreshTokens,
  type ApiUsage,
  type PasswordResetToken,
  type RefreshToken,
} from "@shared/schema";
import type { AdminSession, ApiUsageSummary, InsertApiUsage } from "../admin-types";
import { db, sqlite } from "../db";

export class SessionRepository {
  createRefreshToken(data: {
    token: string;
    userId: number;
    expiresAt: string;
    userAgent?: string | null;
    ip?: string | null;
  }): RefreshToken {
    return db
      .insert(refreshTokens)
      .values({
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revoked: false,
        createdAt: new Date().toISOString(),
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
      })
      .returning()
      .get();
  }

  getRefreshToken(token: string): RefreshToken | undefined {
    return db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).get();
  }

  revokeRefreshToken(token: string): void {
    db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, token)).run();
  }

  revokeRefreshSessionById(id: number): boolean {
    const result = sqlite.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ? AND revoked = 0").run(id);
    return result.changes > 0;
  }

  revokeUserRefreshTokens(userId: number): void {
    db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId)).run();
  }

  deleteExpiredOrRevokedRefreshTokens(nowIso = new Date().toISOString()): void {
    sqlite.prepare("DELETE FROM refresh_tokens WHERE revoked = 1 OR expires_at <= ?").run(nowIso);
  }

  listActiveRefreshSessions(nowIso = new Date().toISOString()): AdminSession[] {
    return sqlite
      .prepare(
        `
      SELECT
        refresh_tokens.id AS id,
        refresh_tokens.user_id AS userId,
        users.username AS username,
        users.email AS email,
        users.display_name AS displayName,
        users.role AS role,
        refresh_tokens.created_at AS createdAt,
        refresh_tokens.expires_at AS expiresAt,
        refresh_tokens.user_agent AS userAgent,
        refresh_tokens.ip AS ip
      FROM refresh_tokens
      JOIN users ON users.id = refresh_tokens.user_id
      WHERE refresh_tokens.revoked = 0
        AND refresh_tokens.expires_at > ?
      ORDER BY refresh_tokens.created_at DESC
    `,
      )
      .all(nowIso) as AdminSession[];
  }

  createPasswordResetToken(data: { token: string; userId: number; expiresAt: string }): PasswordResetToken {
    return db
      .insert(passwordResetTokens)
      .values({
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getPasswordResetToken(tokenHash: string): PasswordResetToken | undefined {
    return db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash)).get();
  }

  markPasswordResetTokenUsed(id: number): void {
    db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id)).run();
  }

  deleteExpiredPasswordResetTokens(nowIso = new Date().toISOString()): void {
    sqlite.prepare("DELETE FROM password_reset_tokens WHERE used = 1 OR expires_at <= ?").run(nowIso);
  }

  recordApiUsage(data: InsertApiUsage): ApiUsage {
    return db
      .insert(apiUsage)
      .values({
        userId: data.userId,
        endpoint: data.endpoint,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        costEstimate: data.costEstimate,
        timestamp: data.timestamp ?? new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getApiUsageSummary(fromIso: string, toIso: string): ApiUsageSummary {
    const rows = sqlite
      .prepare(
        `
      SELECT
        substr(timestamp, 1, 10) AS date,
        COUNT(*) AS requests,
        COALESCE(SUM(tokens_in), 0) AS tokensIn,
        COALESCE(SUM(tokens_out), 0) AS tokensOut,
        COALESCE(SUM(cost_estimate), 0) AS costEstimate
      FROM api_usage
      WHERE endpoint = 'deepseek'
        AND timestamp >= ?
        AND timestamp < ?
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date DESC
    `,
      )
      .all(fromIso, toIso) as Array<{
      date: string;
      requests: number;
      tokensIn: number;
      tokensOut: number;
      costEstimate: number;
    }>;

    const byDay = rows.map((row) => ({
      date: row.date,
      requests: Number(row.requests),
      tokensIn: Number(row.tokensIn),
      tokensOut: Number(row.tokensOut),
      totalTokens: Number(row.tokensIn) + Number(row.tokensOut),
      costEstimate: Number(row.costEstimate),
    }));

    return byDay.reduce<ApiUsageSummary>(
      (summary, day) => ({
        totalRequests: summary.totalRequests + day.requests,
        tokensIn: summary.tokensIn + day.tokensIn,
        tokensOut: summary.tokensOut + day.tokensOut,
        totalTokens: summary.totalTokens + day.totalTokens,
        costEstimate: summary.costEstimate + day.costEstimate,
        byDay: summary.byDay,
      }),
      {
        totalRequests: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        costEstimate: 0,
        byDay,
      },
    );
  }
}

export const sessionRepository = new SessionRepository();
