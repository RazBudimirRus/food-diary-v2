CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `actor_id` integer NOT NULL,
  `actor_role` text NOT NULL,
  `action` text NOT NULL,
  `target_id` integer,
  `detail` text,
  `ip` text,
  `user_agent` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_actor` ON `audit_log`(`actor_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_target` ON `audit_log`(`target_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_created` ON `audit_log`(`created_at`);
