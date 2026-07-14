import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateInstanceDrafts,
  localDateTimeToUtcIso,
  todayInTimeZone,
} from "@/lib/services/instances";
import type { ChoreSchedule, ScheduleException } from "@/lib/types";

export type GenerateResult = { created: number; carried: number };

/**
 * Generate chore instances for one household, `days` ahead from its local today,
 * then carry over unfinished chores from the last 7 days.
 *
 * Shared by the cron route and by parent actions (saving a schedule regenerates
 * today immediately), so both paths behave identically. Fully idempotent.
 */
export async function generateForHousehold(
  householdId: string,
  timezone: string,
  days = 1
): Promise<GenerateResult> {
  const admin = createAdminClient();
  const result: GenerateResult = { created: 0, carried: 0 };

  const from = todayInTimeZone(timezone);
  const to = new Date(`${from}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + Math.max(1, days) - 1);
  const toStr = to.toISOString().slice(0, 10);

  const { data: schedules } = await admin
    .from("chore_schedules")
    .select("*, chores!inner(id, household_id, default_points, active)")
    .eq("chores.household_id", householdId)
    .eq("chores.active", true)
    .eq("active", true);

  const scheduleIds = (schedules ?? []).map((s) => s.id);
  const { data: exceptions } = scheduleIds.length
    ? await admin
        .from("schedule_exceptions")
        .select("*")
        .in("chore_schedule_id", scheduleIds)
        .gte("exception_date", from)
        .lte("exception_date", toStr)
    : { data: [] };

  const drafts = generateInstanceDrafts(
    (schedules ?? []) as unknown as ChoreSchedule[],
    (exceptions ?? []) as unknown as ScheduleException[],
    from,
    toStr
  );

  const pointsBySchedule = new Map(
    (schedules ?? []).map((s) => [s.id, (s.chores as { default_points: number }).default_points])
  );

  const rows = drafts.map((d) => ({
    household_id: householdId,
    chore_id: d.chore_id,
    chore_schedule_id: d.chore_schedule_id,
    assigned_user_id: d.assigned_user_id,
    due_date: d.due_date,
    due_at: d.due_time ? localDateTimeToUtcIso(d.due_date, d.due_time.slice(0, 5), timezone) : null,
    status: d.status,
    points_available: pointsBySchedule.get(d.chore_schedule_id) ?? 10,
    excused_reason: d.excused_reason,
    waived_reason: d.waived_reason,
  }));

  if (rows.length) {
    const { count } = await admin.from("chore_instances").upsert(rows, {
      onConflict: "chore_schedule_id,due_date",
      ignoreDuplicates: true,
      count: "exact",
    });
    result.created = count ?? 0;
  }

  // ----- Carryover: unfinished chores from the last 7 days land on today -----
  const lookback = new Date(`${from}T00:00:00Z`);
  lookback.setUTCDate(lookback.getUTCDate() - 7);
  const lookbackStr = lookback.toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const [{ data: unfinished }, { data: todays }] = await Promise.all([
    admin
      .from("chore_instances")
      .select(
        "chore_id, chore_schedule_id, assigned_user_id, due_date, status, points_available, make_up_due_at, chores!inner(active)"
      )
      .eq("household_id", householdId)
      .gte("due_date", lookbackStr)
      .lt("due_date", from)
      .in("status", ["missed", "pending"])
      .eq("chores.active", true),
    admin
      .from("chore_instances")
      .select("chore_id, assigned_user_id")
      .eq("household_id", householdId)
      .eq("due_date", from),
  ]);

  const onToday = new Set((todays ?? []).map((t) => `${t.chore_id}:${t.assigned_user_id}`));
  type Unfinished = NonNullable<typeof unfinished>[number];
  const latest = new Map<string, Unfinished>();
  for (const u of unfinished ?? []) {
    if (u.status === "pending" && u.make_up_due_at && u.make_up_due_at > nowIso) continue;
    const key = `${u.chore_id}:${u.assigned_user_id}`;
    if (onToday.has(key)) continue;
    const prev = latest.get(key);
    if (!prev || u.due_date > prev.due_date) latest.set(key, u);
  }

  const carryRows = [...latest.values()].map((u) => ({
    household_id: householdId,
    chore_id: u.chore_id,
    chore_schedule_id: u.chore_schedule_id,
    assigned_user_id: u.assigned_user_id,
    due_date: from,
    due_at: null,
    status: "pending" as const,
    points_available: u.points_available ?? 10,
    parent_note: `Carried over from ${u.due_date}`,
  }));

  if (carryRows.length) {
    const { data: inserted } = await admin
      .from("chore_instances")
      .upsert(carryRows, { onConflict: "chore_schedule_id,due_date", ignoreDuplicates: true })
      .select("id");
    result.carried = (inserted ?? []).length;
    for (const row of inserted ?? []) {
      await admin.from("chore_instance_events").insert({
        chore_instance_id: row.id,
        event_type: "carried_over",
        previous_status: null,
        new_status: "pending",
      });
    }
  }

  return result;
}

/** Generate for every household (cron entry point). */
export async function generateForAllHouseholds(days = 1): Promise<GenerateResult> {
  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, timezone");
  const totals: GenerateResult = { created: 0, carried: 0 };
  for (const hh of households ?? []) {
    const r = await generateForHousehold(hh.id, hh.timezone, days);
    totals.created += r.created;
    totals.carried += r.carried;
  }
  return totals;
}
