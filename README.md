# Family Ops

A family chore management app: kids see and complete their own chores; parents manage chores, schedules, approvals, reminders, and reports.

**Status:** Core MVP — schema, RLS, auth, parent management, child workflow, approvals, scoring, and cron jobs are built. Twilio/Resend are feature-flagged stubs. See [docs/implementation-plan.md](docs/implementation-plan.md) for exact done/remaining.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- ESLint + Prettier
- Supabase (Postgres, auth, RLS) + Zod + Vercel cron
- Resend / Twilio (feature-flagged, not yet wired)

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # fill values only when later phases need them
```

## Commands

```bash
npm run dev      # start the dev server at http://localhost:3000
npm run lint     # ESLint
npm run format   # Prettier (write)
npm run build    # production build
npm run start    # serve the production build
```

## Cloud-only setup (no local tools needed)

1. **Supabase**: create a project at supabase.com. In the SQL Editor, run
   `supabase/migrations/0001_schema.sql`, then `0002_rls.sql`. In Authentication → Users,
   add three users: `parent@example.com`, `hudson@example.com`, `brynn@example.com`
   (set passwords). Then run `supabase/seed.sql` in the SQL Editor.
2. **Vercel**: import this GitHub repo at vercel.com. In Project → Settings →
   Environment Variables, add the variables from `.env.example` (Supabase URL, anon key,
   service-role key, and a random `CRON_SECRET`). Leave both feature flags `false`.
3. Deploy. Cron jobs in `vercel.json` run automatically. To backfill chores immediately,
   open `https://<your-app>/api/cron/generate-instances?days=7` with header
   `Authorization: Bearer <CRON_SECRET>` (or wait for the daily run).
4. **Verify security** per docs/security-and-operations.md before giving kids logins.

## Environment variables

- All secrets live in `.env.local` locally and in Vercel environment variables in production.
- `.env.example` lists every variable name with no values; keep it in sync as variables are added.
- `.env*` files are git-ignored. Never commit credentials, and never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (no `NEXT_PUBLIC_` prefix on secrets).
- Twilio and Resend sit behind `ENABLE_SMS_REMINDERS` / `ENABLE_EMAIL_REPORTS` feature flags so the app runs without those credentials.

## Project structure

```
src/
  app/                  # App Router routes
    login/              # placeholder auth page (Phase 2)
    parent/             # placeholder parent dashboard (parent-only from Phase 3)
    kids/[childId]/today/  # placeholder child dashboard
  components/
    layout/             # app shell (header/navigation)
    ui/                 # reusable UI primitives
  lib/                  # shared non-UI code (Supabase clients, Zod schemas later)
docs/                   # architecture and implementation plan
```

## Docs

- [docs/implementation-plan.md](docs/implementation-plan.md) — phased build plan
- [docs/architecture.md](docs/architecture.md) — proposed architecture
