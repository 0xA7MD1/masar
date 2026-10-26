# app
آخر تحديث: 2026-10-27

## الحين
- Masar v1: all 7 pages, auth, Turso/Drizzle, PWA built; lint, typecheck and production build pass. Not deployed yet.
- Add form: job link first and the source is detected from it (LinkedIn, Jadarat, Bayt, Indeed, Tanqeeb, Mourjan, Sabbar, WhatsApp, else company site); title and company optional; new follow-up link field (phone → WhatsApp, email → Gmail search) with a «تابع» button. Migration `0001_follow_up_url` applied to local.db and the Turso database. Theme stays green.
- Goals: one number for a day, week or month; the other two are derived (7 days a week, real month length). Dashboard «أهدافك» card has a badge per period, a win count, and its own celebration (month gets the biggest confetti). Migration `0002_goal_period` applied to local.db and the Turso database.

## يحتاجك
- Command · `git push origin dev` — the deployed build is from `e2b8a6c` and still reads `weekly_goal`, but Turso already renamed it to `goal_target`; every page that reads settings fails until the 2 local commits are pushed and redeployed.

## الجاي
- Deploy to Vercel with `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`.
