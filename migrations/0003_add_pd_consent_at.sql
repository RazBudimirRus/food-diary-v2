-- Migration 0003: add pd_consent_at to users table (152-ФЗ compliance)
-- Safe: uses IF NOT EXISTS logic via ALTER TABLE (no-op if column already exists)
ALTER TABLE `users` ADD COLUMN `pd_consent_at` text;
