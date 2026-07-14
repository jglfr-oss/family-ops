import type { Metadata } from "next";
import Link from "next/link";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setScheduleActive } from "@/lib/actions";
import { ScheduleForm, ExceptionForm, type ScheduleInitial } from "./schedule-forms";
import { WeekView, type WeekSchedule } from "./week-view";
import { DeleteScheduleButton } from "./delete-button";
import { RefreshTodayButton } from "./refresh-button";
import { todayInTimeZone, dayOfWeek } from "@/lib/services/instances";

export const metadata: Metadata = { title: "Schedules" };

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; view?: string; err?: string }>;
}) {
  const parent = await requireParent();
  const { edit, view, err } = await searchParams;
  const supabase = await createClient();
  const [{ data: schedules }, { data: chores }, { data: children }] = await Promise.all([
    supabase
      .from("chore_schedules")
      .select(
        "id, chore_id, assigned_user_id, cadence, due_time, start_date, end_date, days_of_week, day_of_month, one_time_date, late_completion_allowed, make_up_allowed, reminder_eligible, active, chores!inner(id, title, household_id), profiles!chore_schedules_assigned_user_id_fkey(display_name)"
      )
      .eq("chores.household_id", parent.household_id!)
      .order("created_at", { ascending: false }),
    supabase
      .from("chores")
      .select("id, title")
      .eq("household_id", parent.household_id!)
      .eq("active", true)
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", parent.household_id!)
      .eq("role", "child")
      .eq("active", true)
      .order("display_name"),
  ]);

  const editing = edit ? ((schedules ?? []).find((s) => s.id === edit) ?? null) : null;
  const initial: ScheduleInitial | null = editing
    ? {
        id: editing.id,
        chore_id: editing.chore_id,
        assigned_user_id: editing.assigned_user_id,
        cadence: editing.cadence,
        due_time: editing.due_time ? String(editing.due_time).slice(0, 5) : "",
        start_date: editing.start_date,
        end_date: editing.end_date ?? "",
        days_of_week: editing.days_of_week ?? [],
        day_of_month: editing.day_of_month,
        one_time_date: editing.one_time_date ?? "",
        late_completion_allowed: editing.late_completion_allowed,
        make_up_allowed: editing.make_up_allowed,
        reminder_eligible: editing.reminder_eligible,
      }
    : null;

  function describe(s: NonNullable<typeof schedules>[number]): string {
    if (s.cadence === "daily") return "Every day";
    if (s.cadence === "weekly")
      return `Weekly: ${(s.days_of_week ?? []).map((d: number) => DAY[d]).join(", ")}`;
    if (s.cadence === "monthly") return `Monthly on day ${s.day_of_month}`;
    return `One time: ${s.one_time_date}`;
  }

  const weekMode = view === "week";
  const { data: hh } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", parent.household_id!)
    .single();
  const todayDow = dayOfWeek(todayInTimeZone(hh?.timezone ?? "America/New_York"));
  const weekSchedules: WeekSchedule[] = (schedules ?? []).map((s) => ({
    id: s.id,
    cadence: s.cadence,
    due_time: s.due_time,
    days_of_week: s.days_of_week,
    day_of_month: s.day_of_month,
    one_time_date: s.one_time_date,
    active: s.active,
    choreTitle: (s.chores as unknown as { title: string })?.title ?? "?",
    kidName: (s.profiles as unknown as { display_name: string } | null)?.display_name ?? "?",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule Maintenance</h1>
        <div className="flex items-center gap-2">
          <RefreshTodayButton />
          <Link
            href="/parent/schedules"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!weekMode ? "bg-spruce-soft text-spruce-deep" : "text-ink-muted"}`}
          >
            List
          </Link>
          <Link
            href="/parent/schedules?view=week"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${weekMode ? "bg-spruce-soft text-spruce-deep" : "text-ink-muted"}`}
          >
            Week
          </Link>
        </div>
      </div>
      {weekMode ? (
        <WeekView schedules={weekSchedules} todayDow={todayDow} error={err} />
      ) : (
        <>
          <ScheduleForm
            key={initial?.id ?? "new"}
            chores={chores ?? []}
            kids={children ?? []}
            initial={initial}
          />
          <section className="flex flex-col gap-3">
            {(schedules ?? []).map((s) => {
              const chore = s.chores as unknown as { title: string };
              const kid = s.profiles as unknown as { display_name: string } | null;
              return (
                <div key={s.id} className="rounded-card border-line bg-card border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">
                        {chore?.title} → {kid?.display_name ?? "?"}
                        {!s.active && (
                          <span className="text-ink-muted ml-2 text-xs font-medium">(paused)</span>
                        )}
                      </h2>
                      <p className="text-ink-muted text-sm">
                        {describe(s)}
                        {s.due_time ? ` · due ${String(s.due_time).slice(0, 5)}` : ""} · from{" "}
                        {s.start_date}
                        {s.end_date ? ` to ${s.end_date}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/parent/schedules?edit=${s.id}`}
                        className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <form action={setScheduleActive.bind(null, s.id, !s.active)}>
                        <button className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium">
                          {s.active ? "Pause" : "Reactivate"}
                        </button>
                      </form>
                      <DeleteScheduleButton
                        scheduleId={s.id}
                        label={`${chore?.title ?? "?"} → ${kid?.display_name ?? "?"}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {(schedules ?? []).length === 0 && <p className="text-ink-muted">No schedules yet.</p>}
          </section>
          <ExceptionForm
            schedules={(schedules ?? []).map((s) => ({
              id: s.id,
              label: `${(s.chores as unknown as { title: string })?.title} → ${(s.profiles as unknown as { display_name: string } | null)?.display_name ?? "?"}`,
            }))}
          />
        </>
      )}
    </div>
  );
}
