# app
آخر تحديث: 2026-10-29

## الحين
- Data access moved to `@supabase/supabase-js` with Clerk tokens: the browser reads and writes Supabase directly, server components prefetch with the request's token, and RLS policies, column grants, CHECK constraints, triggers and the `import_backup` RPC enforce isolation. Lint, typecheck, build and `pnpm test:isolation` (38 checks) pass. Ahmed ran the migrations on Supabase, connected Clerk and Supabase, imported his Turso data and checked the app locally. PR from `dev` to `main` opened; not merged.
- Repo made public under AGPL-3.0 (`LICENSE`, README Contributing and License sections). Local `.env.local` deleted; secrets live in Vercel and Ahmed's password manager. History scanned: no secrets.
- `/api/cron/keepalive` calls the `keepalive()` RPC as anon, guarded by `CRON_SECRET`, every 5 days.

## يحتاجك
- Command · Clerk dashboard → Domains: add the production domain if you use a Clerk production instance — its domain then goes in Supabase Third-Party Auth too; without it sign-in or the token check fails in production.

## الجاي
- Merge the PR into `main` when you approve it, then check the deployed app once.
- Retire Turso after you confirm the import.
- Optional: a Clerk `user.deleted` webhook to delete a removed user's rows.
- Realtime sync between open tabs, later.
