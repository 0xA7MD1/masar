# مسار — Masar

A private, single-user job application tracker. Log every application in under 30 seconds, move it through a Kanban pipeline, and stay motivated with streaks, weekly goals, milestones and a little confetti.

The whole UI is Arabic and right-to-left.

## Features

- **Dashboard**: greeting with a daily motivational line, weekly goal, streak, KPI strip, 6-month heatmap, due/overdue follow-ups, a nudge for applications with no reply after 21 days, activity feed and milestone stickers.
- **Board**: drag-and-drop Kanban (dnd-kit) with optimistic updates and a keyboard-friendly "move to" menu on every card.
- **Applications**: searchable, filterable, sortable table (cards on mobile).
- **Quick add**: modal on desktop, bottom sheet on mobile. Press `N` anywhere to open it.
- **Details**: edit every field, see the status timeline, delete with confirmation.
- **Stats** (Recharts): applications per week, response rate by source, hiring funnel, tech vs non-tech split, average days to first response.
- **Settings**: weekly goal, display name, JSON/CSV export, JSON restore, logout.
- **PWA**: installable, with an offline fallback page.

## Tech stack

- Next.js 15 (App Router, Server Components, Server Actions), TypeScript
- SQLite on [Turso](https://turso.tech) (libSQL) with Drizzle ORM
- Tailwind CSS v4 + shadcn/ui (RTL mode)
- `jose` signed session cookie, `zod` validation, Recharts, dnd-kit, canvas-confetti

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | In production | Turso database URL, e.g. `libsql://masar-<org>.turso.io`. Leave empty locally to use `file:local.db`. |
| `TURSO_AUTH_TOKEN` | In production | Turso auth token for the database. |
| `APP_PASSWORD` | Yes | The single password that unlocks the app. |
| `SESSION_SECRET` | Yes | At least 32 random characters used to sign the session cookie. |
| `NEXT_PUBLIC_APP_TIMEZONE` | No | Timezone for "today", streaks and weeks. Defaults to `Asia/Riyadh`. |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Changing `SESSION_SECRET` signs out every device.

## Local development

```bash
pnpm install
cp .env.example .env.local   # then set APP_PASSWORD and SESSION_SECRET
pnpm db:migrate              # creates local.db
pnpm db:seed                 # optional: 10 realistic sample applications
pnpm dev
```

Open http://localhost:3000 and sign in with `APP_PASSWORD`.

The local SQLite file is only a development fallback. In production (on Vercel) the app refuses to start without `TURSO_DATABASE_URL`, because Vercel's filesystem is ephemeral.

## Creating a Turso database

1. Install the Turso CLI and sign in:

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

   On Windows, use WSL or `scoop install turso`.

2. Create the database and read its URL:

   ```bash
   turso db create masar
   turso db show masar --url
   ```

3. Create an auth token:

   ```bash
   turso db tokens create masar
   ```

4. Put the URL and token in `.env.local` (to run migrations from your machine) and in your Vercel project settings.

## Migrations

The schema lives in `src/db/schema.ts`; generated SQL migrations live in `drizzle/`.

```bash
pnpm db:migrate     # apply migrations to the database in TURSO_DATABASE_URL (or local.db)
pnpm db:generate    # after editing schema.ts, generate a new migration
pnpm db:studio      # browse the data with Drizzle Studio
```

To migrate the production database, run `pnpm db:migrate` with the Turso variables set in `.env.local` (or in your shell).

`pnpm db:seed` deletes all data before inserting the samples, so it refuses to run against a remote database unless you pass `--force`.

## Deploying to Vercel

1. Create the Turso database and run `pnpm db:migrate` against it (see above).
2. Push this project to a Git repository and import it in Vercel. The framework preset is detected as Next.js; keep the default build command (`pnpm build`).
3. In **Project Settings → Environment Variables**, add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD` and `SESSION_SECRET`.
4. Deploy. Visit the site, sign in, and install it from the browser menu ("Add to Home Screen" on iOS).

To apply migrations automatically on each deploy, set the build command to `pnpm db:migrate && pnpm build`.

## Security notes

- Every route except `/login` and static assets is protected by `src/middleware.ts`; every server action and the export route re-check the session.
- The session is an HS256 JWT (`jose`) in an `httpOnly`, `secure` (in production), `sameSite=lax` cookie that expires after 30 days.
- Failed logins are counted per client IP in the `login_attempts` table: 5 failures within 15 minutes lock that IP out for 15 minutes.
- The password comparison is constant-time.

## Backups

Settings → **تصدير JSON** downloads a complete backup (applications, status history and settings). **استيراد من JSON** replaces all current data with a backup, in a single transaction. CSV export is for spreadsheets and cannot be imported.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Replace local data with sample applications |
| `pnpm db:studio` | Open Drizzle Studio |
| `node scripts/generate-icons.mjs` | Re-render the PWA icons from the logo |

## Project structure

```
src/
  actions/           server actions (applications, settings, backup)
  app/
    (app)/           authenticated pages: dashboard, board, applications, stats, settings
    api/export/      JSON and CSV export
    login/           login page and action
    manifest.ts      PWA manifest
  components/        UI; components/ui holds the shadcn/ui primitives
  db/                Drizzle schema and client
  lib/               constants, dates, metrics, queries, validation, auth
  middleware.ts      route protection
drizzle/             SQL migrations
scripts/             migrate, seed, icon generation
public/              icons, service worker, offline page
```
