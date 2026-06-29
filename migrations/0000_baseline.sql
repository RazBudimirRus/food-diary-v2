CREATE TABLE `api_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`timestamp` text DEFAULT '' NOT NULL,
	`endpoint` text NOT NULL,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL,
	`cost_estimate` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`wake_time` text,
	`sleep_time` text,
	`wake_date` text,
	`sleep_date` text,
	`sport_activity` text,
	`steps` integer,
	`day_comment` text,
	`summary_filled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `doctor_meal_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doctor_id` integer NOT NULL,
	`meal_id` integer NOT NULL,
	`note` text,
	`suggested_kcal` real,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `doctor_patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doctor_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`assigned_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `doctor_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doctor_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`kcal` real,
	`protein` real,
	`fat` real,
	`carbs` real,
	`water_ml` real,
	`notes` text,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`telegram_url` text,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doctors_user_id_unique` ON `doctors` (`user_id`);--> statement-breakpoint
CREATE TABLE `food_catalog_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`meal_name` text NOT NULL,
	`grams` real,
	`kcal` real,
	`protein` real,
	`fat` real,
	`carbs` real
);
--> statement-breakpoint
CREATE TABLE `food_catalog_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_set` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`ts_start` text NOT NULL,
	`ts_end` text,
	`meal_type` text NOT NULL,
	`food_text` text,
	`drink_text` text,
	`water_units` real,
	`hunger_before` integer,
	`satiety_after` integer,
	`context_note` text,
	`source` text DEFAULT 'web' NOT NULL,
	`raw_input` text,
	`calories` real,
	`protein` real,
	`fat` real,
	`carbs` real,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`meal_id` integer,
	`s3_key` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	`user_agent` text,
	`ip` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`iv` text NOT NULL,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`gender` text DEFAULT 'unspecified',
	`height_cm` real,
	`weight_kg` real,
	`activity_level` text DEFAULT 'medium',
	`target_kcal` real,
	`target_protein` real,
	`target_fat` real,
	`target_carbs` real,
	`onboarding_skipped` integer DEFAULT false,
	`updated_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`pd_consent_at` text,
	`created_at` text DEFAULT '' NOT NULL,
	`last_login_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);