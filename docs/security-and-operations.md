# Security and Operations

## Authorization: two enforced layers

1. **Row Level Security** (supabase/migrations/0002_rls.sql). Children can read only their own chore instances and update only their own pending instances; parents are scoped to their household; no policy grants cross-household access. The service-role key bypasses RLS and is used only by cron routes via a server-only admin client.
2. **Server-side guards** (`requireParent`, `requireChildSelf` in `src/lib/auth.ts`) on every protected page, plus Zod validation on every mutation in `src/lib/actions.ts`.

## Verify RLS after running migrations (do this once)

Sign in as hudson@example.com and confirm: `/parent` redirects away; `/kids/<brynns-id>/today` redirects to Hudson's own page; the Supabase API returns zero rows for Brynn's instances. This 5-minute check is the most important test in the system.

## Cron protection and idempotency

All `/api/cron/*` routes require `Authorization: Bearer <CRON_SECRET>` (Vercel sends this automatically when the CRON_SECRET env var is set). Instance generation is idempotent via a unique index on (chore_schedule_id, due_date) with ignore-duplicates upserts; reminders are deduplicated per child/window/day against reminder_log; completion uses a status-conditional update to prevent duplicate submissions.

## Secrets

`.env.local` locally (git-ignored), Vercel environment variables in production. `SUPABASE_SERVICE_ROLE_KEY` is only ever read in `src/lib/supabase/admin.ts`, which imports "server-only" so any client-side import fails the build. Never prefix secrets with NEXT_PUBLIC_.

## Backup and recovery

Supabase (all plans) provides scheduled backups; see the Database → Backups page in the dashboard. Migrations in `supabase/migrations/` are the schema's source of truth — a fresh project can be rebuilt by running 0001, 0002, then seed.sql.

## Known gaps (intentional, for later passes)

Quiet-hour evaluation in the reminder cron, Twilio/Resend senders (flag-gated stubs today), rate limiting on completion endpoints, audit-log UI, calendar view, bulk schedule edits, and 30-day schedule preview.
