-- Migration 0003: add pd_consent_at to users table (152-ФЗ compliance)
ALTER TABLE `users` ADD COLUMN `pd_consent_at` text;
