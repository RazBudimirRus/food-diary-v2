ALTER TABLE `users` ADD COLUMN `mfa_enabled` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `mfa_secret` text;
