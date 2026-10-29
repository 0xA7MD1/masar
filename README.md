# مسار — Masar

A multi-user job application tracker; every account sees only its own data. Log every application in under 30 seconds, move it through a Kanban pipeline, and stay motivated with streaks, weekly goals, milestones and a little confetti.

The whole UI is Arabic and right-to-left.

## Features

- **Dashboard**: greeting with a daily motivational line, weekly goal, streak, KPI strip, 6-month heatmap, due/overdue follow-ups, a nudge for applications with no reply after 21 days, activity feed and milestone stickers.
- **Board**: drag-and-drop Kanban (dnd-kit) with optimistic updates and a keyboard-friendly "move to" menu on every card.
- **Applications**: searchable, filterable, sortable table (cards on mobile).
- **Quick add**: modal on desktop, bottom sheet on mobile. Press `N` anywhere to open it.
- **Details**: edit every field, see the status timeline, delete with confirmation.
- **Stats** (Recharts): applications per week, response rate by source, hiring funnel, tech vs non-tech split, average days to first response.
- **Settings**: daily, weekly or monthly goal, display name, JSON/CSV export, JSON restore, sign out.
- **PWA**: installable, with an offline fallback page.

## Tech stack

- Next.js 15 (App Router, Server Components), TypeScript
- Postgres on [Supabase](https://supabase.com), reached through `@supabase/supabase-js` with the user's Clerk token; row level security keeps users apart
- Drizzle ORM for the schema and migrations only (`drizzle-kit`, plus the local scripts)
- [Clerk](https://clerk.com) for sign-in and sign-up, in Arabic (`@clerk/localizations` `ar-SA`), connected to Supabase as a third-party auth provider
- TanStack Query for server data: server components prefetch and hydrate, the browser reads and writes Supabase directly and invalidates the cache (optimistic on the kanban drag)
- Zustand for UI state only (quick add, filters, celebrations)
- Tailwind CSS v4 + shadcn/ui (RTL mode), `zod`, Recharts, dnd-kit, canvas-confetti

## Environment variables

Copy `.env.example` to `.env` and fill it in. The same names go in Vercel.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key (`sb_publishable_…`). Safe in the browser: on its own it reaches nothing. |
| `DATABASE_URL` | Only for the scripts | Supabase **transaction pooler** connection string (port 6543), for migrate, seed and the Turso import. The app never uses it. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key. |
| `CRON_SECRET` | In production | Guards `/api/cron/keepalive`; Vercel Cron sends it as a bearer token. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Only for the import | The old Turso database, read by `pnpm db:import-turso`. |
| `NEXT_PUBLIC_APP_TIMEZONE` | No | Timezone for "today", streaks and goals. Defaults to `Asia/Riyadh`. |

## Clerk and Supabase

Both sides must be connected once, or every request runs as `anon` and is refused:

1. Supabase: **Authentication → Sign In / Providers → Third-Party Auth → Clerk**, with your Clerk domain.
2. Clerk: **Connect with Supabase** (`dashboard.clerk.com/setup/supabase`), so session tokens carry `role: authenticated`.

## Local development

```bash
pnpm install
cp .env.example .env         # then fill in the values
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000 and sign up. To fill your account with 10 sample applications:

```bash
pnpm db:seed --user <your Clerk user id>
```

The seed replaces that user's data only.

## Data isolation

Every table has a `user_id` (the Clerk user id), filled in by the database from the token's `sub` claim. The browser talks to the Supabase Data API directly, so the database enforces isolation itself:

- **Policies** (`src/db/schema.ts`): every table allows only rows where `user_id = auth.jwt()->>'sub'`, for the `authenticated` role. An id that belongs to someone else behaves like a missing row.
- **Grants** (`drizzle/0002_rls_functions.sql`): `anon` gets nothing. `authenticated` can update only the columns a form edits, never `id`, `user_id` or the timestamps. Status history can only be read and added to.
- **Checks**: every enum column, text length, date format and goal range is a `CHECK` constraint, since a user can skip the browser's validation.
- **Triggers**: the status history row and `updated_at` are written by the database in the same transaction as the change.
- **Functions**: `import_backup(jsonb)` restores a backup in one transaction as the caller; `keepalive()` is the only thing `anon` can run.

`settings` is one row per user, created on the first visit.

`pnpm test:isolation` proves it: two users and a signed-out visitor on an in-memory Postgres (PGlite, with the real migrations and Supabase's roles) try every read, write and import the Data API allows, and never see or change each other's rows.

## Migrations

The schema lives in `src/db/schema.ts`; generated SQL migrations live in `drizzle/`.

```bash
pnpm db:migrate     # apply migrations to DATABASE_URL
pnpm db:generate    # after editing schema.ts, generate a new migration (policies and checks included)
pnpm db:studio      # browse the data with Drizzle Studio
```

## Moving the old Turso data

`scripts/import-turso.ts` copies the old single-user Turso database into Supabase under one Clerk user, through the same `import_backup` function as the in-app restore. Turso is only read.

```bash
pnpm db:import-turso --user <Clerk user id>            # dry run: shows the counts
pnpm db:import-turso --user <Clerk user id> --write    # imports
```

It refuses to overwrite a user who already has data unless you add `--replace`.

## Deploying to Vercel

1. Run `pnpm db:migrate` against the Supabase database, and connect Clerk and Supabase (above).
2. In **Project Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `CRON_SECRET`. `DATABASE_URL` is not needed there.
3. Deploy. `vercel.json` schedules `/api/cron/keepalive` every 5 days; it calls `keepalive()` through the Data API, so the Supabase free tier never pauses for inactivity.

## Backups

Settings → **تصدير JSON** downloads a complete backup of your own data (applications, status history and settings). **استيراد من JSON** replaces your data (and only yours) with a backup, in a single transaction. CSV export is for spreadsheets and cannot be imported.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm test:isolation` | Prove two users can't see or change each other's data |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed --user <id>` | Replace one user's data with sample applications |
| `pnpm db:import-turso --user <id>` | Copy the old Turso data to one user |
| `pnpm db:studio` | Open Drizzle Studio |
| `node scripts/generate-icons.mjs` | Re-render the PWA icons from the logo |

## Project structure

```
src/
  app/
    (app)/           signed-in pages; the layout prefetches the shared data
    api/export/      JSON and CSV export of the signed-in user's data
    api/cron/        keepalive cron
    sign-in/, sign-up/  Clerk pages
  components/        UI; each page has a client view that reads the query cache
  db/                Drizzle schema (with policies and checks) and the scripts' Postgres client
  hooks/             TanStack Query hooks (queries and mutations)
  lib/data/          Supabase reads, writes and the row mapping
  lib/supabase/      Supabase clients for the browser and the server, with the Clerk token
  lib/               constants, dates, metrics, query keys, validation
  stores/            Zustand UI stores
  middleware.ts      Clerk route protection
drizzle/             SQL migrations: tables, policies and checks, grants, triggers, functions
scripts/             migrate, seed, Turso import, isolation check, icon generation
public/              icons, service worker, offline page
```
