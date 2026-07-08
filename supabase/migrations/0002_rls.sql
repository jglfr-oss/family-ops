-- Row Level Security. Paste into Supabase SQL Editor after 0001.

-- Helper functions (security definer so they can read profiles inside policies).
create or replace function public.user_household() returns uuid
language sql stable security definer set search_path = public as
$$ select household_id from public.profiles where id = auth.uid() $$;

create or replace function public.user_is_parent() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'parent' and active) $$;

-- Enable RLS everywhere. No policy = no access for anon/authenticated;
-- the service-role key (server only) bypasses RLS for system jobs.
do $$ declare t text;
begin
  foreach t in array array['households','profiles','household_settings','chores','chore_schedules',
    'schedule_exceptions','chore_instances','chore_instance_events','score_events','reminder_log',
    'report_log','parent_overrides','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- households: members read; parents update.
create policy household_read on public.households for select
  using (id = public.user_household());
create policy household_update on public.households for update
  using (id = public.user_household() and public.user_is_parent());

-- profiles: everyone reads own row; household members read display info for
-- leaderboard; only parents update household profiles; users update own basics.
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or household_id = public.user_household());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid());
create policy profiles_parent_update on public.profiles for update
  using (household_id = public.user_household() and public.user_is_parent());

-- household_settings: parents only.
create policy settings_parent_all on public.household_settings for all
  using (household_id = public.user_household() and public.user_is_parent())
  with check (household_id = public.user_household() and public.user_is_parent());

-- chores + schedules + exceptions: parents manage; children may read chores
-- (titles appear on their own instances) but NOT schedules or exceptions.
create policy chores_parent_all on public.chores for all
  using (household_id = public.user_household() and public.user_is_parent())
  with check (household_id = public.user_household() and public.user_is_parent());
create policy chores_child_read on public.chores for select
  using (household_id = public.user_household());

create policy schedules_parent_all on public.chore_schedules for all
  using (public.user_is_parent() and exists (
    select 1 from public.chores c where c.id = chore_id and c.household_id = public.user_household()))
  with check (public.user_is_parent() and exists (
    select 1 from public.chores c where c.id = chore_id and c.household_id = public.user_household()));

create policy exceptions_parent_all on public.schedule_exceptions for all
  using (public.user_is_parent() and exists (
    select 1 from public.chore_schedules s join public.chores c on c.id = s.chore_id
    where s.id = chore_schedule_id and c.household_id = public.user_household()))
  with check (public.user_is_parent() and exists (
    select 1 from public.chore_schedules s join public.chores c on c.id = s.chore_id
    where s.id = chore_schedule_id and c.household_id = public.user_household()));

-- chore_instances:
--   parents: full access in household.
--   children: read ONLY their own; update ONLY their own pending -> completed.
create policy instances_parent_all on public.chore_instances for all
  using (household_id = public.user_household() and public.user_is_parent())
  with check (household_id = public.user_household() and public.user_is_parent());
create policy instances_child_read on public.chore_instances for select
  using (assigned_user_id = auth.uid());
create policy instances_child_complete on public.chore_instances for update
  using (assigned_user_id = auth.uid() and status = 'pending')
  with check (assigned_user_id = auth.uid() and status in ('completed','approved'));

-- instance events: parents read household; children read their own instances' events;
-- any household member may insert events for instances they can see (audit trail).
create policy events_parent_read on public.chore_instance_events for select
  using (public.user_is_parent() and exists (
    select 1 from public.chore_instances i where i.id = chore_instance_id and i.household_id = public.user_household()));
create policy events_child_read on public.chore_instance_events for select
  using (exists (select 1 from public.chore_instances i where i.id = chore_instance_id and i.assigned_user_id = auth.uid()));
create policy events_insert on public.chore_instance_events for insert
  with check (actor_user_id = auth.uid() and exists (
    select 1 from public.chore_instances i where i.id = chore_instance_id
      and (i.assigned_user_id = auth.uid() or (i.household_id = public.user_household() and public.user_is_parent()))));

-- score_events: readable household-wide (leaderboard totals only expose points);
-- written by parents or by the child completing their own auto-approved chore.
create policy scores_read on public.score_events for select
  using (household_id = public.user_household());
create policy scores_parent_insert on public.score_events for insert
  with check (household_id = public.user_household() and public.user_is_parent());
create policy scores_child_insert on public.score_events for insert
  with check (household_id = public.user_household() and user_id = auth.uid()
    and exists (select 1 from public.chore_instances i
      where i.id = chore_instance_id and i.assigned_user_id = auth.uid() and i.status = 'approved'));

-- logs, overrides, audit: parents read; writes come from parents or service role.
create policy reminder_log_parent on public.reminder_log for select
  using (household_id = public.user_household() and public.user_is_parent());
create policy report_log_parent on public.report_log for select
  using (household_id = public.user_household() and public.user_is_parent());
create policy overrides_parent_all on public.parent_overrides for all
  using (household_id = public.user_household() and public.user_is_parent())
  with check (household_id = public.user_household() and public.user_is_parent());
create policy audit_parent_read on public.audit_log for select
  using (household_id = public.user_household() and public.user_is_parent());
create policy audit_member_insert on public.audit_log for insert
  with check (household_id = public.user_household() and actor_user_id = auth.uid());
