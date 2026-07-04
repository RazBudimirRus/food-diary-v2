ALTER TABLE `meals` ADD COLUMN `deleted_at` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_meals_deleted_at` ON `meals`(`deleted_at`);
