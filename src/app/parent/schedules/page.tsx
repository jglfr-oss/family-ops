import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setScheduleActive } from "@/lib/actions";
import { ScheduleForm, ExceptionForm } from "./schedule-forms";

export const metadata: Metadata = { title: "Schedules" };

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchedulesPage() {
  const parent = await requireParent();
  const supabase = await createClient();
  const [{ data: schedules }, { data: chores }, { data: children }] = await Promise.all([
    supabase
      .from("chore_schedules")
      .select(
        "id, cadence, due_time, start_date, end_date, days_of_week, day_of_month, one_time_date, active, chores!inner(id, title, household_id), profiles!chore_schedules_assigned_user_id_fkey(display_name)"
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

  function describe(s: NonNullable<typeof schedules>[number]): string {
    if (s.cadence === "daily") return "Every day";
    if (s.cadence === "weekly")
      return `Weekly: ${(s.days_of_week ?? []).map((d: number) => DAY[d]).join(", ")}`;
    if (s.cadence === "monthly") return `Monthly on day ${s.day_of_month}`;
    return `One time: ${s.one_time_date}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Schedules</h1>
      <ScheduleForm chores={chores ?? []} kids={children ?? []} />
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
                <form action={setScheduleActive.bind(null, s.id, !s.active)}>
                  <button className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium">
                    {s.active ? "Pause" : "Reactivate"}
                  </button>
                </form>
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
    </div>
  );
}
