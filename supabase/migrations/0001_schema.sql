-- Family Ops schema. Self-contained: paste into Supabase SQL Editor and run.

create type public.app_role as enum ('parent', 'child');
create type public.chore_cadence as enum ('daily', 'weekly', 'monthly', 'one_time');
create type public.instance_status as enum ('pending','completed','approved','rejected','missed','excused','waived');
create type public.exception_type as enum ('skip','reassignment','due_time_change','waive','excused');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id),
  role public.app_role not null default 'parent',
  display_name text not null default 'New member',
  phone_number text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_settings (
  household_id uuid primary key references public.households(id) on delete cascade,
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '07:00',
  daily_closeout_time time not null default '20:30',
  leaderboard_enabled boolean not null default true,
  reminders_paused boolean not null default false,
  reminder_pause_start date,
  reminder_pause_end date,
  reminder_pause_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  default_points int not null default 10,
  requires_approval boolean not null default false,
  active boolean not null default true,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chore_schedules (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  assigned_user_id uuid not null references public.profiles(id),
  cadence public.chore_cadence not null,
  due_time time,
  start_date date not null,
  end_date date,
  days_of_week int[] , -- 0=Sunday .. 6=Saturday
  day_of_month int check (day_of_month between 1 and 31),
  one_time_date date,
  reminder_eligible boolean not null default true,
  late_completion_allowed boolean not null default false,
  make_up_allowed boolean not null default false,
  make_up_deadline_hours int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  chore_schedule_id uuid not null references public.chore_schedules(id) on delete cascade,
  exception_date date not null,
  exception_type public.exception_type not null,
  replacement_due_time time,
  replacement_assignee_id uuid references public.profiles(id),
  parent_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (chore_schedule_id, exception_date)
);

create table public.chore_instances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chore_id uuid not null references public.chores(id),
  chore_schedule_id uuid references public.chore_schedules(id) on delete set null,
  assigned_user_id uuid not null references public.profiles(id),
  due_date date not null,
  due_at timestamptz,
  status public.instance_status not null default 'pending',
  points_available int not null default 10,
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id),
  parent_note text,
  excused_reason text,
  waived_reason text,
  make_up_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Idempotent generation: one instance per schedule per date.
create unique index chore_instances_schedule_date_key
  on public.chore_instances (chore_schedule_id, due_date)
  where chore_schedule_id is not null;

create table public.chore_instance_events (
  id uuid primary key default gen_random_uuid(),
  chore_instance_id uuid not null references public.chore_instances(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_type text not null,
  previous_status public.instance_status,
  new_status public.instance_status,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.score_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  chore_instance_id uuid references public.chore_instances(id) on delete set null,
  event_type text not null,
  points int not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_user_id uuid not null references public.profiles(id),
  chore_instance_id uuid references public.chore_instances(id) on delete set null,
  reminder_type text not null,
  delivery_channel text not null,
  provider_message_id text,
  delivery_status text not null,
  error_message text,
  sent_at timestamptz not null default now()
);

create table public.report_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  report_type text not null,
  period_start date not null,
  period_end date not null,
  recipient text not null,
  delivery_status text not null,
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default now()
);

create table public.parent_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chore_instance_id uuid not null references public.chore_instances(id) on delete cascade,
  parent_user_id uuid not null references public.profiles(id),
  override_type text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index on public.profiles (household_id);
create index on public.chores (household_id, active);
create index on public.chore_schedules (assigned_user_id, active);
create index on public.chore_schedules (chore_id);
create index on public.chore_instances (household_id, due_date);
create index on public.chore_instances (assigned_user_id, due_date, status);
create index on public.chore_instances (household_id, status);
create index on public.chore_instance_events (chore_instance_id);
create index on public.score_events (household_id, user_id, occurred_at);
create index on public.reminder_log (household_id, sent_at);
create index on public.report_log (household_id, sent_at);
create index on public.audit_log (household_id, created_at);

-- updated_at maintenance
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  foreach t in array array['households','profiles','household_settings','chores','chore_schedules','chore_instances']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Create a profile automatically when an auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,'new-member'), '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
