/**
 * server/config.ts — named constants for the application.
 * Import from here instead of using magic numbers in routes/storage.
 */

// Auth token TTLs
export const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "30m";
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
export const REFRESH_TOKEN_TTL_ENV = process.env.JWT_REFRESH_EXPIRES_IN;
export const REFRESH_COOKIE_MAX_AGE_ENV = process.env.REFRESH_COOKIE_MAX_AGE;

// Password reset
export const PASSWORD_RESET_TTL_MINUTES = 60;
export const PASSWORD_RESET_TTL_SECONDS = PASSWORD_RESET_TTL_MINUTES * 60;

// Rate limiting windows (milliseconds)
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
export const LOGIN_RATE_MAX = 10;
export const MEAL_CREATE_RATE_WINDOW_MS = 60 * 1000; // 1 min
export const MEAL_CREATE_RATE_MAX = 30;
export const FORGOT_PW_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const FORGOT_PW_RATE_MAX = 5;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const AUDIT_LOG_PAGE_SIZE = 50;

// Analytics
export const ANALYTICS_MAX_DAYS = 90;

// Idle session
export const IDLE_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

// Photos (Phase 29.5)
export const MAX_PHOTO_SIZE_MB = Number(process.env.PHOTO_MAX_SIZE_MB) || 50;
export const PHOTO_MAX_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
export const PHOTO_MAX_PER_USER = Number(process.env.PHOTO_MAX_PER_USER) || 500;

// Health check: the S3 probe writes and deletes a real object, so it is cached.
// The docker healthcheck polls /api/health every 30s; without caching that is
// ~2900 write+delete pairs per day against the bucket.
export const HEALTH_S3_CACHE_MS = Number(process.env.HEALTH_S3_CACHE_MS) || 5 * 60 * 1000;
