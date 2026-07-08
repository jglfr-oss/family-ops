-- Family Ops seed. Run AFTER 0001 and 0002, and AFTER creating three auth users
-- in the Supabase dashboard (Authentication -> Users -> Add user):
--   parent@example.com  (your placeholder parent; change later)
--   hudson@example.com
--   brynn@example.com
-- Set a password for each. The signup trigger creates their profile rows.

do $$
declare hh uuid;
begin
  insert into public.households (name, timezone)
  values ('Our Household', 'America/New_York') returning id into hh;

  insert into public.household_settings (household_id) values (hh);

  update public.profiles set household_id = hh, role = 'parent', display_name = 'Parent'
    where email = 'parent@example.com';
  update public.profiles set household_id = hh, role = 'child', display_name = 'Hudson'
    where email = 'hudson@example.com';
  update public.profiles set household_id = hh, role = 'child', display_name = 'Brynn'
    where email = 'brynn@example.com';

  -- Sample chores + daily schedules for both kids.
  insert into public.chores (household_id, title, description, default_points, requires_approval)
  values
    (hh, 'Make your bed', 'Before school', 10, false),
    (hh, 'Feed the dog', 'Morning scoop, fresh water', 10, false),
    (hh, 'Clean your room', 'Floor clear, desk tidy', 15, true);

  insert into public.chore_schedules (chore_id, assigned_user_id, cadence, due_time, start_date, days_of_week)
  select c.id, p.id, 'daily', '08:00', current_date, null
  from public.chores c
  join public.profiles p on p.household_id = hh and p.role = 'child'
  where c.household_id = hh and c.title = 'Make your bed';

  insert into public.chore_schedules (chore_id, assigned_user_id, cadence, due_time, start_date, days_of_week)
  select c.id, p.id, 'weekly', '17:00', current_date, array[6]
  from public.chores c
  join public.profiles p on p.household_id = hh and p.role = 'child'
  where c.household_id = hh and c.title = 'Clean your room';
end $$;
