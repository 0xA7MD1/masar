# app
آخر تحديث: 2026-10-27

## الحين
- Masar v1: all 7 pages, auth, Turso/Drizzle, PWA built; lint, typecheck and production build pass, verified locally in the browser. Not deployed yet.

## يحتاجك
- Command · `turso db create masar` then `turso db show masar --url` and `turso db tokens create masar` — production needs a Turso database; put the URL and token in `.env.local` and in Vercel env vars (never in chat). Without it the app refuses to start on Vercel.
- Command · `pnpm db:migrate` with the Turso variables set — creates the tables in the production database; without it every page errors.

## الجاي
- Deploy to Vercel with `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`.
