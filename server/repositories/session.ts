import { storage } from "../storage";

export class SessionRepository {
  createRefreshToken(data: Parameters<typeof storage.createRefreshToken>[0]) {
    return storage.createRefreshToken(data);
  }
  getRefreshToken(token: string) {
    return storage.getRefreshToken(token);
  }
  revokeRefreshToken(token: string) {
    return storage.revokeRefreshToken(token);
  }
  revokeRefreshSessionById(id: number) {
    return storage.revokeRefreshSessionById(id);
  }
  revokeUserRefreshTokens(userId: number) {
    return storage.revokeUserRefreshTokens(userId);
  }
  deleteExpiredOrRevokedRefreshTokens(nowIso?: string) {
    return storage.deleteExpiredOrRevokedRefreshTokens(nowIso);
  }
  listActiveRefreshSessions(nowIso?: string) {
    return storage.listActiveRefreshSessions(nowIso);
  }
  createPasswordResetToken(data: Parameters<typeof storage.createPasswordResetToken>[0]) {
    return storage.createPasswordResetToken(data);
  }
  getPasswordResetToken(tokenHash: string) {
    return storage.getPasswordResetToken(tokenHash);
  }
  markPasswordResetTokenUsed(id: number) {
    return storage.markPasswordResetTokenUsed(id);
  }
  deleteExpiredPasswordResetTokens(nowIso?: string) {
    return storage.deleteExpiredPasswordResetTokens(nowIso);
  }
  recordApiUsage(data: Parameters<typeof storage.recordApiUsage>[0]) {
    return storage.recordApiUsage(data);
  }
  getApiUsageSummary(fromIso: string, toIso: string) {
    return storage.getApiUsageSummary(fromIso, toIso);
  }
}

export const sessionRepository = new SessionRepository();
