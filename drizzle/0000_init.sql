CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`job_title` text NOT NULL,
	`company` text NOT NULL,
	`source` text NOT NULL,
	`job_type` text,
	`work_mode` text,
	`location` text,
	`job_url` text,
	`applied_date` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`expected_salary` text,
	`cv_tailored` integer DEFAULT false NOT NULL,
	`next_follow_up` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_applied_date_idx` ON `applications` (`applied_date`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL,
	`locked_until` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`weekly_goal` integer DEFAULT 10 NOT NULL,
	`display_name` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `status_history_application_idx` ON `status_history` (`application_id`);