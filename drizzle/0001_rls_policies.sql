ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "user_id" SET DEFAULT (auth.jwt()->>'sub');--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "user_id" SET DEFAULT (auth.jwt()->>'sub');--> statement-breakpoint
ALTER TABLE "status_history" ALTER COLUMN "user_id" SET DEFAULT (auth.jwt()->>'sub');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_source_check" CHECK ("source" in ('linkedin', 'jadarat', 'bayt', 'indeed', 'tanqeeb', 'mourjan', 'sabbar', 'company_site', 'whatsapp', 'walk_in', 'referral', 'other'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_type_check" CHECK ("job_type" is null or "job_type" in ('tech', 'non_tech'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_work_mode_check" CHECK ("work_mode" is null or "work_mode" in ('onsite', 'remote', 'hybrid'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_status_check" CHECK ("status" in ('saved', 'applied', 'contacted', 'interview', 'offer', 'accepted', 'rejected', 'ghosted'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_priority_check" CHECK ("priority" in ('low', 'medium', 'high'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_title_length" CHECK (char_length("job_title") <= 160);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_length" CHECK (char_length("company") <= 160);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_location_length" CHECK (char_length("location") <= 120);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_url_length" CHECK (char_length("job_url") <= 2048);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_expected_salary_length" CHECK (char_length("expected_salary") <= 80);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_notes_length" CHECK (char_length("notes") <= 5000);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_follow_up_url_length" CHECK (char_length("follow_up_url") <= 2048);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applied_date_format" CHECK ("applied_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_next_follow_up_format" CHECK ("next_follow_up" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_goal_period_check" CHECK ("goal_period" in ('day', 'week', 'month'));--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_goal_target_range" CHECK (goal_target >= 1 and goal_target <= case goal_period when 'day' then 50 when 'week' then 300 when 'month' then 1000 end);--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_display_name_length" CHECK (char_length("display_name") <= 40);--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_from_status_check" CHECK ("from_status" is null or "from_status" in ('saved', 'applied', 'contacted', 'interview', 'offer', 'accepted', 'rejected', 'ghosted'));--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_to_status_check" CHECK ("to_status" in ('saved', 'applied', 'contacted', 'interview', 'offer', 'accepted', 'rejected', 'ghosted'));--> statement-breakpoint
CREATE POLICY "applications_select_own" ON "applications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "applications_insert_own" ON "applications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "applications_update_own" ON "applications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.jwt()->>'sub')) WITH CHECK (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "applications_delete_own" ON "applications" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "settings_select_own" ON "settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "settings_insert_own" ON "settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "settings_update_own" ON "settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.jwt()->>'sub')) WITH CHECK (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "status_history_select_own" ON "status_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.jwt()->>'sub'));--> statement-breakpoint
CREATE POLICY "status_history_insert_own" ON "status_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.jwt()->>'sub') and exists (
        select 1 from public.applications a where a.id = application_id and a.user_id = (select auth.jwt()->>'sub')
      ));