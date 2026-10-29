# app
آخر تحديث: 2026-10-29

## الحين
- Data access moved to `@supabase/supabase-js` with Clerk tokens: the browser reads and writes Supabase directly, server components prefetch with the request's token, and RLS policies, column grants, CHECK constraints, triggers and the `import_backup` RPC enforce isolation (`drizzle/0001_rls_policies.sql`, `drizzle/0002_rls_functions.sql`). Server actions, `src/lib/queries.ts` and the runtime Postgres connection are gone. Lint, typecheck, build and `pnpm test:isolation` (38 checks: two users and anon, against the real policies) pass. Not run against the real Supabase or in a browser yet: no keys in `.env`.
- `scripts/import-turso.ts` now restores through `import_backup`, same as the in-app restore. Tested earlier against local Postgres only; not run against Supabase yet.
- `/api/cron/keepalive` calls the `keepalive()` RPC as anon, guarded by `CRON_SECRET`, every 5 days.

## يحتاجك
- Command · Clerk dashboard "Connect with Supabase" (`dashboard.clerk.com/setup/supabase`) — adds `role: authenticated` to session tokens; without it every request runs as `anon` and the app shows the error page.
- Blocker · `.env` has no `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CRON_SECRET`, `DATABASE_URL` — names are in `.env.example`. All go in `.env`; all but `DATABASE_URL` go in Vercel. Without them the app can't start and the real two-account check can't run.
- Command · `pnpm db:migrate` — creates the tables, policies, grants, triggers and functions in Supabase; every page fails without them.
- Command · `pnpm db:import-turso --user <your Clerk user id> --write` — after you sign up once; copies your old data. Run it without `--write` first to see the counts.

## الجاي
- Browser check with two real Clerk accounts against the real Supabase: add, edit, drag on the board, delete, settings, export, import.
- Retire Turso after you confirm the import.
- Deploy the new build to Vercel.
- Realtime sync between open tabs, later.
