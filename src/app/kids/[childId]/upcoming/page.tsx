import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dayOfWeek, generateInstanceDrafts, todayInTimeZone } from "@/lib/services/instances";
import type { ChoreSchedule, ScheduleException } from "@/lib/types";

export const metadata: Metadata = { title: "Upcoming" };

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addDays(dateOnly: string, n: number): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function friendlyLabel(dateOnly: string, today: string): string {
  if (dateOnly === today) return "Today";
  if (dateOnly === addDays(today, 1)) return "Tomorrow";
  return WEEKDAY[dayOfWeek(dateOnly)];
}

export default async function UpcomingPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  await requireChildSelf(childId);
  const supabase = await createClient();

  const { data: kid } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", childId)
    .single();
  const { data: hh } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", kid?.household_id ?? "")
    .single();
  const tz = hh?.timezone ?? "America/New_York";
  const today = todayInTimeZone(tz);
  const endDate = addDays(today, 6);

  // Schedules assigned to this child (active chores only).
  const { data: schedules } = await supabase
    .from("chore_schedules")
    .select("*, chores!inner(id, title, active)")
    .eq("assigned_user_id", childId)
    .eq("active", true)
    .eq("chores.active", true);

  const scheduleIds = (schedules ?? []).map((s) => s.id);
  const { data: exceptions } = scheduleIds.length
    ? await supabase
        .from("schedule_exceptions")
        .select("*")
        .in("chore_schedule_id", scheduleIds)
        .gte("exception_date", today)
        .lte("exception_date", endDate)
    : { data: [] };

  const titleById = new Map(
    (schedules ?? []).map((s) => [s.id, (s.chores as { title: string }).title])
  );

  // Predict the next 7 days from the recurrence rules (no DB writes).
  const drafts = generateInstanceDrafts(
    (schedules ?? []) as unknown as ChoreSchedule[],
    (exceptions ?? []) as unknown as ScheduleException[],
    today,
    endDate
  );

  // Group by day.
  const byDay = new Map<string, { title: string; dueTime: string | null }[]>();
  for (let i = 0; i < 7; i += 1) byDay.set(addDays(today, i), []);
  for (const d of drafts) {
    const list = byDay.get(d.due_date);
    if (!list) continue;
    list.push({
      title: titleById.get(d.chore_schedule_id) ?? "Chore",
      dueTime: d.due_time ? d.due_time.slice(0, 5) : null,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Upcoming</h1>
      <p className="text-ink-muted -mt-2 text-sm">
        A look at the next 7 days. You complete chores on the Today tab once each day arrives.
      </p>

      {[...byDay.entries()].map(([date, items]) => (
        <section key={date} className="rounded-card border-line bg-card border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">{friendlyLabel(date, today)}</h2>
            <span className="text-ink-muted text-xs">{date}</span>
          </div>
          {items.length === 0 ? (
            <p className="text-ink-muted mt-2 text-sm">No chores scheduled.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {items.map((it, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 text-sm">
                  <span>{it.title}</span>
                  {it.dueTime && <span className="text-ink-muted text-xs">by {it.dueTime}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
