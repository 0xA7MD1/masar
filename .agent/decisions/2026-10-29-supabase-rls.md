# Data access: browser to Supabase with Clerk tokens and RLS
2026-10-29 · decided by Ahmed

- The browser reads and writes Supabase directly with `@supabase/supabase-js` and the Clerk session token. Server components use the same reads with the request's token, for the first paint only.
- Isolation lives in the database: RLS policies on `user_id = auth.jwt()->>'sub'`, column grants, CHECK constraints, triggers for history and `updated_at`, and the `import_backup` function.
- Drizzle stays for the schema, the policies, the migrations and the local scripts. It is not in the app runtime, and the app has no `DATABASE_URL`.
- Realtime comes later, once the move is checked with real accounts.
