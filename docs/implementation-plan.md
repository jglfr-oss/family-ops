# Family Ops — Implementation Plan

Built as one consolidated pass on top of the Phase 1 foundation. Status below.

## Done

- Foundation: Next.js App Router, TypeScript, Tailwind v4, ESLint + Prettier, mobile-first shell
- Schema: 13 tables, enums, indexes, constraints, updated_at triggers (supabase/migrations/0001)
- Row Level Security for every table + auto-profile creation on signup (0002)
- Seed script: household, Hudson, Brynn, placeholder parent, sample chores/schedules
- Auth: email/password login, /auth/callback, logout, role-based redirects
- Server-side guards on all parent and kid routes (layer 2 over RLS)
- Parent: dashboard, chore create/pause/reactivate/archive, schedule create (all four cadences)
  with duplicate detection, pause/reactivate, one-day exceptions (skip/excused/waive)
- Instance generation engine (pure + unit-tested) with exception handling and timezone-correct due times
- Child: Today with one-tap completion, week view, history with reliability score, leaderboard
- Completion lifecycle: pending → completed/approved, deadline + duplicate-submission guards,
  approval queue, reject-with-required-note (back to pending if window open), parent overrides with reasons
- Scoring: on-time 10 / late 7, streaks, reliability score (50/30/20), leaderboard toggle respected
- Cron routes (CRON_SECRET-protected, idempotent): generate-instances, reminders (3 windows,
  deduplicated, pause-aware), closeout with make-up windows, daily/weekly/monthly report logging
- Feature-flagged Twilio/Resend abstractions — app fully works with both flags off
- 21 unit tests (generation, exceptions, dates, scoring, streaks, reliability)
- Audit trail: chore_instance_events on every transition, audit_log on parent admin actions,
  parent_overrides with required reasons

## Remaining (future passes)

- Twilio + Resend real senders and polished HTML reports
- Quiet hours and per-child reminder pause in the reminder cron
- Chore edit/duplicate/reassign UI; bulk changes; 30-day schedule preview; calendar view
- Audit log, reports, reminders, and settings pages under /parent
- Badges, weekly awards (Most Improved etc.), per-child competition opt-out
- Rate limiting; Playwright end-to-end tests; RLS policy test script
