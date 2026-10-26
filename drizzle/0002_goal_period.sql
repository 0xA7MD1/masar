ALTER TABLE `settings` RENAME COLUMN `weekly_goal` TO `goal_target`;--> statement-breakpoint
ALTER TABLE `settings` ADD `goal_period` text DEFAULT 'week' NOT NULL;
