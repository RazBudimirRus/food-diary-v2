-- Migration 0009: client_errors table
-- Stores frontend errors (window.onerror, ErrorBoundary) for admin review.
-- Retention policy: 7 days enforced at application level (cleanup on insert).

CREATE TABLE IF NOT EXISTS client_errors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  extra       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors (created_at);
CREATE INDEX IF NOT EXISTS idx_client_errors_user_id    ON client_errors (user_id);
