# app
آخر تحديث: 2026-10-27

## الحين
- Masar v1: all 7 pages, auth, Turso/Drizzle, PWA built; lint, typecheck and production build pass. Not deployed yet.
- Add form: job link first and the source is detected from it (LinkedIn, Jadarat, Bayt, Indeed, Tanqeeb, Mourjan, Sabbar, WhatsApp, else company site); title and company optional; new follow-up link field (phone → WhatsApp, email → Gmail search) with a «تابع» button. Migration `0001_follow_up_url` applied to local.db and the Turso database. Theme stays green.
- Goals: one number for a day, week or month; the other two are derived (7 days a week, real month length). Dashboard «أهدافك» card has a badge per period, a win count, and its own celebration (month gets the biggest confetti). Migration `0002_goal_period` applied to local.db only; Turso still needs it.

## يحتاجك
- Command · `pnpm db:migrate` — applies `0002_goal_period` to Turso; the auto-mode classifier blocked me from running it. Until it runs, every page that reads settings fails on Turso with the same «Failed query» error.

## الجاي
- Deploy to Vercel with `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`.
