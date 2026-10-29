# app
آخر تحديث: 2026-10-29

## الحين
- Multi-user migration done in code: Supabase Postgres (`postgres-js`, `prepare: false`, fresh `drizzle/0000_init.sql` with `user_id` on every table and RLS on), Clerk sign-in/sign-up in Arabic RTL, TanStack Query (layout prefetch + hydrate, one key file, optimistic kanban), Zustand for quick add, filters and celebrations. Old password login, `login_attempts` and `src/lib/auth/*` removed. Lint, typecheck, build and `pnpm test:isolation` (24 checks, two users) pass. Not run in a browser yet: no Clerk keys.
- `scripts/import-turso.ts` tested: read the real Turso (20 applications, 25 status changes) and wrote them into a local Postgres. Turso untouched. Not run against Supabase yet.
- `/api/cron/keepalive` with `CRON_SECRET` and a daily cron in `vercel.json`.
- Full move to supabase-js from the browser with Clerk tokens and RLS: plan only, in `_AGENT_HUB/_PLANS/supabase-clerk-rls.md`. Nothing executed.

## يحتاجك
- قرار · خطة التحويل لـ RLS: الطلبات من المتصفح، ونبقي Drizzle للجداول بس، والتحديث اللحظي بعدين؟ — التفاصيل في ملف الخطة. **ترشيحي: نعم للثلاثة.**
- Command · Clerk dashboard "Connect with Supabase" — adds `role: authenticated` to session tokens; without it every request runs as `anon` and returns nothing.
- Blocker · `.env` has no `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CRON_SECRET` — names are in `.env.example`; put the values in `.env` and in Vercel. Without them the app can't start, and the real two-account browser check can't run.
- Command · `pnpm db:migrate` — creates the tables in Supabase; every page fails without them.
- Command · `pnpm db:import-turso --user <your Clerk user id> --write` — after you sign up once; copies your old data. Run it without `--write` first to see the counts.

## الجاي
- Two-account check in the browser with real Clerk once the keys are in `.env`.
- Retire Turso after you confirm the import.
- Deploy the new build to Vercel.
