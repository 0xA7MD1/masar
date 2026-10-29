-- Grants, triggers and functions for the browser's direct access with Clerk tokens.
-- The policies themselves come from src/db/schema.ts (0001_rls_policies.sql).

-- Signed-out visitors (anon) get nothing. Signed-in users get only the verbs the app needs,
-- and can update only the columns a form edits: never id, user_id or the timestamps.
REVOKE ALL ON TABLE "public"."applications", "public"."status_history", "public"."settings" FROM "anon", "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE "public"."applications" TO "authenticated";--> statement-breakpoint
GRANT UPDATE ("job_title", "company", "source", "job_type", "work_mode", "location", "job_url", "applied_date", "status", "expected_salary", "cv_tailored", "next_follow_up", "priority", "notes", "follow_up_url") ON TABLE "public"."applications" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "public"."status_history" TO "authenticated";--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "public"."settings" TO "authenticated";--> statement-breakpoint
GRANT UPDATE ("goal_target", "goal_period", "display_name") ON TABLE "public"."settings" TO "authenticated";--> statement-breakpoint
GRANT USAGE ON SEQUENCE "public"."applications_id_seq", "public"."status_history_id_seq" TO "authenticated";--> statement-breakpoint

CREATE FUNCTION "public"."applications_set_updated_at"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "applications_set_updated_at" BEFORE UPDATE ON "public"."applications"
FOR EACH ROW EXECUTE FUNCTION "public"."applications_set_updated_at"();--> statement-breakpoint

-- Every application starts with one history row, and every status change adds one, in the
-- same transaction as the write. The backup import and the seed write their own history,
-- so they turn this off with `masar.skip_history`.
CREATE FUNCTION "public"."applications_record_status"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_setting('masar.skip_history', true) = 'on' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.status_history (user_id, application_id, from_status, to_status, changed_at)
    VALUES (NEW.user_id, NEW.id, NULL, NEW.status, NEW.created_at);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history (user_id, application_id, from_status, to_status, changed_at)
    VALUES (NEW.user_id, NEW.id, OLD.status, NEW.status, NEW.updated_at);
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER "applications_record_status" AFTER INSERT OR UPDATE OF "status" ON "public"."applications"
FOR EACH ROW EXECUTE FUNCTION "public"."applications_record_status"();--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."applications_set_updated_at"(), "public"."applications_record_status"() FROM PUBLIC, "anon", "authenticated";--> statement-breakpoint

-- Replaces the caller's applications, history and settings with a backup, in one transaction.
-- Runs as the caller, so the policies still apply: it can only ever touch their own rows.
-- `payload` is the shape src/lib/backup-payload.ts builds: validated and normalised.
CREATE FUNCTION "public"."import_backup"("payload" jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  uid text := (SELECT auth.jwt()->>'sub');
  s jsonb := payload->'settings';
  id_map jsonb;
  app_count int;
  history_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('masar.skip_history', 'on', true);

  -- History goes with the applications through ON DELETE CASCADE.
  DELETE FROM public.applications WHERE user_id = uid;

  -- Ids are shared by every user, so rows get fresh ids and history follows the old → new map.
  SELECT coalesce(jsonb_object_agg(a->>'id', nextval(pg_get_serial_sequence('public.applications', 'id'))), '{}'::jsonb)
  INTO id_map
  FROM jsonb_array_elements(payload->'applications') AS a;

  INSERT INTO public.applications (
    id, user_id, created_at, updated_at, job_title, company, source, job_type, work_mode, location, job_url,
    applied_date, status, expected_salary, cv_tailored, next_follow_up, priority, notes, follow_up_url
  )
  SELECT
    (id_map->>(a->>'id'))::int, uid, (a->>'created_at')::timestamptz, (a->>'updated_at')::timestamptz,
    a->>'job_title', a->>'company', a->>'source', a->>'job_type', a->>'work_mode', a->>'location', a->>'job_url',
    a->>'applied_date', a->>'status', a->>'expected_salary', (a->>'cv_tailored')::boolean, a->>'next_follow_up',
    a->>'priority', a->>'notes', a->>'follow_up_url'
  FROM jsonb_array_elements(payload->'applications') AS a;
  GET DIAGNOSTICS app_count = ROW_COUNT;

  INSERT INTO public.status_history (user_id, application_id, from_status, to_status, changed_at)
  SELECT uid, (id_map->>(h->>'application_id'))::int, h->>'from_status', h->>'to_status', (h->>'changed_at')::timestamptz
  FROM jsonb_array_elements(payload->'status_history') AS h
  WHERE id_map ? (h->>'application_id')
  ORDER BY (h->>'id')::int;
  GET DIAGNOSTICS history_count = ROW_COUNT;

  IF jsonb_typeof(s) = 'object' THEN
    INSERT INTO public.settings (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.settings SET
      display_name = coalesce(s->>'display_name', display_name),
      goal_period = coalesce(s->>'goal_period', goal_period),
      goal_target = coalesce((s->>'goal_target')::int, goal_target)
    WHERE user_id = uid;
  END IF;

  RETURN jsonb_build_object('applications', app_count, 'history', history_count);
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."import_backup"(jsonb) FROM PUBLIC, "anon";--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."import_backup"(jsonb) TO "authenticated";--> statement-breakpoint

-- For the keep-alive cron, which has no user: one real read, and nothing it returns is private.
CREATE FUNCTION "public"."keepalive"() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT count(*)::int FROM (SELECT 1 FROM public.settings LIMIT 1) AS s;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."keepalive"() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."keepalive"() TO "anon", "authenticated";
