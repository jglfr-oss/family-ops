# Family Ops — Architecture

## Overview

A Next.js App Router application backed by Supabase (Postgres, auth, Row Level Security), deployed on Vercel with cron-triggered jobs for chore generation, reminders, and reports.

```
Browser (parent / child)
   │
   ▼
Next.js (Vercel)
 ├─ App Router pages (server components by default)
 ├─ Server actions / route handlers (Zod-validated, role-checked)
 └─ Cron route handlers (CRON_SECRET-protected)
   │
   ▼
Supabase
 ├─ Postgres (all application data)
 ├─ Auth (parent + child accounts)
 └─ Row Level Security (database-layer authorization)

Outbound (feature-flagged): Resend (parent email reports), Twilio (child SMS reminders)
```

## Authorization: two enforced layers

1. **Row Level Security** — children can only read/write their own rows; parents scoped to their household. This is the ultimate guarantee; the UI is never trusted.
2. **Server-side checks** — every protected page and route handler re-verifies session and role before acting. Front-end route hiding is cosmetic only.

## Core data concepts

- **Chores** are master definitions; **chore_schedules** define recurrence; **chore_instances** are the dated records children actually complete. The master record is never a completion record.
- Instance states: `pending → completed → approved/rejected`, plus `missed`, `excused`, `waived`. Every transition is recorded in `chore_instance_events`.
- **schedule_exceptions** modify single dates (skip, reassign, due-time change, waive, excuse) without altering the base schedule.
- **audit_log** and **parent_overrides** keep an immutable history of administrative changes; overrides always require a reason.
- **score_events** are append-only, so leaderboards and reliability scores can be recomputed and history is never destroyed.

## Background jobs (Vercel cron → protected API routes)

Instance generation, morning/afternoon/evening reminders, daily closeout (missed-chore processing), and daily/weekly/monthly parent reports. All jobs are idempotent, respect household timezone, quiet hours, and pause windows, and write to `reminder_log` / `report_log`.

## Front-end structure

- `src/app` — routes; server components by default, client components only where interactivity requires it (e.g., navigation, forms).
- `src/components/ui` — small reusable primitives; `src/components/layout` — app shell.
- `src/lib` — Supabase clients (server/browser), Zod schemas, env access.
- Mobile-first Tailwind v4 styling with a small token set defined in `globals.css`.

## Secrets and configuration

`.env.local` locally, Vercel env vars in production, `.env.example` as the contract. Service-role keys are server-only. Twilio/Resend are feature-flagged so the app runs fully without external credentials.
