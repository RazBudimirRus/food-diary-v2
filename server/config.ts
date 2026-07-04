/**
 * server/config.ts — named constants for the application.
 * Import from here instead of using magic numbers in routes/storage.
 */

// Auth token TTLs
export const ACCESS_TOKEN_TTL = "30m";
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

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
