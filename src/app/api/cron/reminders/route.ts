import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendSms } from "@/lib/services/notifications";
import { isPaused, isQuietTime, type ReminderSettings } from "@/lib/services/reminder-rules";

/** Current wall-clock time "HH:MM" in an IANA timezone. */
function nowTimeIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Reminder pass (?window=morning|afternoon|evening). Respects pause windows
 * and quiet hours, skips children with nothing pending or no phone number,
 * and sends at most one SMS per child per window per day.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}` || !env.cronSecret)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const window = new URL(request.url).searchParams.get("window") ?? "morning";
  const admin = createAdminClient();
  const { data: households } = await admin
    .from("households")
    .select(
      "id, timezone, household_settings(reminders_paused, reminder_pause_start, reminder_pause_end, quiet_hours_start, quiet_hours_end)"
    );
  let logged = 0;
  let skippedQuiet = 0;
  let skippedPaused = 0;

  for (const hh of households ?? []) {
    const settings = (hh.household_settings ?? null) as unknown as ReminderSettings | null;
    const today = todayInTimeZone(hh.timezone);

    if (isPaused(settings, today)) {
      skippedPaused += 1;
      continue;
    }
    const quietStart = String(settings?.quiet_hours_start ?? "21:00").slice(0, 5);
    const quietEnd = String(settings?.quiet_hours_end ?? "07:00").slice(0, 5);
    if (isQuietTime(nowTimeIn(hh.timezone), quietStart, quietEnd)) {
      skippedQuiet += 1;
      continue;
    }

    const { data: pendings } = await admin
      .from("chore_instances")
      .select("id, assigned_user_id, chore_schedule_id, chore_schedules!inner(reminder_eligible)")
      .eq("household_id", hh.id)
      .eq("due_date", today)
      .eq("status", "pending")
      .eq("chore_schedules.reminder_eligible", true);

    const byChild = new Map<string, number>();
    for (const i of pendings ?? [])
      byChild.set(i.assigned_user_id, (byChild.get(i.assigned_user_id) ?? 0) + 1);

    for (const [childId, count] of byChild) {
      const { data: already } = await admin
        .from("reminder_log")
        .select("id")
        .eq("child_user_id", childId)
        .eq("reminder_type", `${window}:${today}`)
        .limit(1);
      if (already && already.length > 0) continue;

      const { data: child } = await admin
        .from("profiles")
        .select("phone_number, display_name")
        .eq("id", childId)
        .single();

      const name = child?.display_name ? `${child.display_name}, you` : "You";
      const result = await sendSms(
        child?.phone_number ?? "",
        `${name} have ${count} chore${count === 1 ? "" : "s"} left today. You've got this!`
      );
      await admin.from("reminder_log").insert({
        household_id: hh.id,
        child_user_id: childId,
        reminder_type: `${window}:${today}`,
        delivery_channel: "sms",
        delivery_status: result.status,
        provider_message_id: result.providerMessageId,
        error_message: result.error,
      });
      logged += 1;
    }
  }
  return NextResponse.json({ ok: true, window, logged, skippedQuiet, skippedPaused });
}
