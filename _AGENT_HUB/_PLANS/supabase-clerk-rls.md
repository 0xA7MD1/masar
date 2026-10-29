# التحويل الكامل: Clerk مع Supabase والحماية في القاعدة
آخر تحديث: 2026-10-29
الحالة: خطة بس، ما انفّذ منها شي.

## الهدف
- التطبيق يكلم القاعدة من المتصفح مباشرة بتوكن المستخدم، بدل ما يمر كل شي على السيرفر.
- القاعدة نفسها هي الي تمنع أي مستخدم يشوف أو يعدّل بيانات غيره، مو الكود.
- الشكل والصفحات والمكوّنات ما تتغيّر، التغيير كله في طبقة البيانات.

## الوضع الحالي
- Server components and server actions use Drizzle over `DATABASE_URL` as the table owner, which bypasses RLS.
- Every query filters by the Clerk `userId` in code: `src/lib/queries.ts`, `src/actions/applications.ts`, `src/actions/settings.ts`, `src/actions/data.ts`, `src/db/replace-user-data.ts`, `src/app/api/export/route.ts`.
- RLS is on with no policies, so the Supabase Data API returns nothing today.
- Components use camelCase fields and `Date` objects for `createdAt`, `updatedAt` and `changedAt`.

## الشكل بعد التحويل
- The browser uses `@supabase/supabase-js` with `accessToken: () => session.getToken()` from Clerk.
- Server components use a server client with `(await auth()).getToken()` for the first-paint prefetch only.
- RLS policies on every table: `user_id = (select auth.jwt()->>'sub')`, for the `authenticated` role only.
- Drizzle stays for the schema, the generated types and `drizzle-kit` migrations. It leaves the app runtime.
- `DATABASE_URL` stays only for local scripts: migrate, seed and the Turso import.

## المراحل
كل مرحلة لها commit لحالها، والفحوصات تمشي قبله.

### ٠. التجهيز (عليك)
- Clerk dashboard: open "Connect with Supabase" (`dashboard.clerk.com/setup/supabase`) so session tokens carry `role: authenticated`. The Supabase side is already done.
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env` and Vercel.
- بدون خطوة Clerk، كل الطلبات تمشي كزائر وترجع فاضية بدون أي خطأ واضح.

### ١. القاعدة: ملف migration جديد
- `user_id` defaults to `(auth.jwt()->>'sub')` on all three tables, so the client never sends it.
- Policies per table for select, insert, update and delete, all `to authenticated`, with `using` and `with check` on `user_id`.
- `status_history` insert also checks that `application_id` belongs to the same user. No update or delete policies there; the FK cascade still removes it.
- Revoke everything from `anon`. Grant the four verbs to `authenticated` on the tables and `usage` on the identity sequences.
- CHECK constraints for every enum column (`source`, `status`, `job_type`, `work_mode`, `priority`, `goal_period`), text length limits, and `goal_target` bounds.
- السبب: التحقق كان على السيرفر، والحين المتصفح يرسل مباشرة، فالقاعدة لازم ترفض البيانات الغلط بنفسها.
- Trigger `set_updated_at` before update on `applications`.
- Trigger after insert, and after update of `status`, on `applications` that writes the `status_history` row. This replaces the two-step transactions in the actions.
- RPC `import_backup(data jsonb)` as `security invoker`: replaces the caller's rows in one transaction, same logic as `replaceUserData`.
- RPC `keepalive()` granted to `anon`, returns a real `select` on a table. Used by the cron route.
- Policies and grants go into `src/db/schema.ts` with Drizzle's `pgPolicy` and `authenticatedRole`, so `drizzle-kit generate` writes them. Triggers and functions go in a hand-written custom migration.

### ٢. عملاء Supabase وطبقة التحويل
- `src/lib/supabase/browser.ts`: one browser client per session, using Clerk's `useSession`.
- `src/lib/supabase/server.ts`: a per-request server client using `auth().getToken()`.
- `src/lib/data/rows.ts`: maps snake_case rows to the existing `Application`, `StatusChange` and settings shapes, turning timestamps into `Date`.
- Row types come from the Drizzle schema, so no Supabase CLI login or `supabase gen types` is needed.
- بكذا المكوّنات ما تحس بأي فرق.

### ٣. القراءة
- `src/hooks/use-masar-data.ts`: each `queryFn` calls supabase-js directly through the mapper.
- `src/app/(app)/layout.tsx` and the detail page prefetch with the server client, same query keys.
- First visit: `getSettings` becomes an upsert with `onConflict: ignore`, then a select.
- Delete `src/actions/data.ts` and `src/lib/queries.ts`.

### ٤. الكتابة
- Mutations in the hooks call supabase-js directly: insert, update, update status, delete, settings upsert.
- zod validation from `src/lib/validation.ts` stays and runs in the browser before sending.
- The "saved to applied sets today's date" rule stays in the client, in one shared helper.
- Celebrations and encouragement move to a pure helper that compares the cache before and after the write. `src/lib/metrics.ts` and `src/lib/celebrations.ts` are already pure.
- Backup import calls the `import_backup` RPC.
- Delete `src/actions/applications.ts`, `src/actions/settings.ts` and `src/db/replace-user-data.ts`; the Turso import script gets its own copy or calls the RPC.

### ٥. السيرفر الباقي
- `src/app/api/export/route.ts` reads through the server client with the user's token.
- `src/app/api/cron/keepalive/route.ts` calls the `keepalive()` RPC with the publishable key.
- `src/db/index.ts` and the runtime `postgres` connection are removed from the app.
- `src/middleware.ts` stays as is.

### ٦. الفحص
- Rewrite `scripts/isolation/check.ts` to test the policies in PGlite: stub `auth.jwt()` from `request.jwt.claims`, create the `anon` and `authenticated` roles, and run each user inside `set local role`.
- Cases: Alice can't read, update or delete Bob's rows; can't insert with Bob's `user_id`; can't attach history to Bob's application; can't move a row to another user; `anon` sees nothing; bad enum values are rejected.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:isolation`.
- Browser check with two real Clerk accounts against the real Supabase: add, edit, drag on the board, delete, settings, export, import.

### ٧. التنظيف
- Update `README.md`, `.env.example` and `_AGENT_HUB/_STATUS/app.md`.
- Remove the old comment in `src/db/schema.ts` that says isolation is done in every query.

### ٨. لاحقاً، اختياري
- Realtime: subscribe to `applications` changes so two open tabs stay in sync. Needs nothing new once RLS is in.

## المخاطر
- لو التوكن ما فيه الدور الصحيح، الطلبات ترجع فاضية بصمت. نضيف رسالة واضحة لو المستخدم مسجل والرد فاضي ومرفوض.
- أي مستخدم يقدر يتجاوز التحقق في المتصفح، بس يأثر على بياناته هو بس، والقاعدة ترفض القيم الغلط.
- المستخدم يقدر يزيّف احتفالاته لنفسه، وهذا ما يضر أحد.
- No per-user row limit exists; a user could flood their own tables. Acceptable for now.
- الملفات المتأثرة كثيرة، فالتنفيذ يكون مرحلة مرحلة، وكل مرحلة تنفحص قبل الي بعدها.

## قرارات
- قرار · وين تنفّذ الطلبات: من المتصفح مباشرة، ولا من السيرفر بتوكن المستخدم؟ **ترشيحي: المتصفح**، لأنه الهدف من الربط ويفتح باب التحديث اللحظي.
- قرار · Drizzle يبقى للجداول والـ migrations بس، ولا ننتقل لأدوات Supabase بالكامل؟ **ترشيحي: يبقى**، لأن الجداول مكتوبة فيه والفحص يعتمد عليه.
- قرار · التحديث اللحظي الحين ولا بعدين؟ **ترشيحي: بعدين**، نخلّص التحويل ونتأكد منه أول.
