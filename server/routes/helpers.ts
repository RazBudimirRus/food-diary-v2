import crypto from "crypto";
import type { Response } from "express";
import type { AuthRequest } from "../auth";
import {
  signToken,
  refreshCookieOptions,
  clearLegacyAuthCookieOptions,
  generateRefreshToken,
  hashToken,
  getRefreshExpiresAt,
  getRefreshCookieName,
} from "../auth";
import { storage } from "../storage";
import { PASSWORD_RESET_TTL_SECONDS } from "../config";

export const refreshCookieName = getRefreshCookieName();

export function publicUser(user: {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  role: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? "");
}

export function issueSession(
  req: AuthRequest,
  res: Response,
  user: {
    id: number;
    username: string;
    email: string;
    displayName?: string | null;
    role: "user" | "admin" | "doctor";
  },
) {
  const rawRefreshToken = generateRefreshToken();
  const expiresAt = getRefreshExpiresAt();

  storage.createRefreshToken({
    token: hashToken(rawRefreshToken),
    userId: user.id,
    expiresAt: expiresAt.toISOString(),
    userAgent: req.get("user-agent") ?? null,
    ip: req.ip ?? null,
  });

  res.cookie(refreshCookieName, rawRefreshToken, refreshCookieOptions());
  res.clearCookie("token", clearLegacyAuthCookieOptions());

  return {
    accessToken: signToken({ userId: user.id, username: user.username, role: user.role }),
    user: publicUser(user),
  };
}

export function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export function passwordResetExpiresAt(): Date {
  // NOTE: PASSWORD_RESET_TTL_SECONDS (config.ts) === original literal 60 * 60 * 1000 ms window
  return new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);
}

export const forgotPasswordResponse = {
  ok: true,
  message: "Если email зарегистрирован, мы отправили ссылку для сброса пароля.",
};

export function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const to = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

export function deepseekDailyLimitStatus(now = new Date()) {
  const dailyTokenLimit = readPositiveNumber(process.env.DEEPSEEK_DAILY_TOKEN_LIMIT, 0);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const todaySummary = storage.getApiUsageSummary(todayStart.toISOString(), tomorrowStart.toISOString());
  const todayTokens = todaySummary.totalTokens;

  return {
    dailyTokenLimit,
    todayTokens,
    dailyLimitExceeded: dailyTokenLimit > 0 && todayTokens >= dailyTokenLimit,
  };
}
