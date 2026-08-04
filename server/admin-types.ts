import type { User } from "@shared/schema";

export interface AdminSession {
  id: number;
  userId: number;
  username: string;
  email: string;
  displayName: string | null;
  role: User["role"];
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
}

export interface InsertApiUsage {
  userId: number;
  endpoint: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  timestamp?: string;
}

export interface ApiUsageDay {
  date: string;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  requests: number;
}

export interface ApiUsageSummary {
  totalRequests: number;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  byDay: ApiUsageDay[];
}
