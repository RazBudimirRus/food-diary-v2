export interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "doctor" | "admin";
}

export interface AdminSession {
  id: number;
  userId: number;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "doctor" | "admin";
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
}

export interface DeepSeekUsageDay {
  date: string;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  requests: number;
}

export interface DeepSeekCheckResult {
  ok: boolean;
  durationMs: number;
  result?: { calories: number; protein: number; fat: number; carbs: number; note?: string };
  detail?: string;
}

export interface S3TestStep {
  ok: boolean;
  durationMs: number;
  detail: string;
}

export interface S3TestResult {
  ok: boolean;
  steps: {
    put: S3TestStep;
    get: S3TestStep;
    delete: S3TestStep;
  };
  error?: string;
}

export interface S3UserStat {
  userId: number | null;
  username: string;
  count: number;
  totalBytes: number;
}

export interface S3BucketStats {
  totalObjects: number;
  totalBytes: number;
  byUser: S3UserStat[];
  truncated: boolean;
}

export interface S3UploadTestResult {
  ok: boolean;
  put: { ok: boolean; durationMs: number; sizeBytes?: number; detail?: string };
  get: { ok: boolean; durationMs: number; sizeBytes?: number; detail?: string };
  delete: { ok: boolean; durationMs: number; detail?: string };
  key: string;
  detail?: string;
}

export interface DeepSeekUsageSummary {
  totalRequests: number;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  byDay: DeepSeekUsageDay[];
  dailyTokenLimit: number;
  todayTokens: number;
  dailyLimitExceeded: boolean;
  analysisBlocked: boolean;
}

export interface AuditLogEntry {
  id: number;
  actorId: number;
  actorRole: "user" | "doctor" | "admin";
  action: string;
  targetId: number | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ClientError {
  id: number;
  userId: number | null;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  extra: string | null;
  createdAt: string;
}
