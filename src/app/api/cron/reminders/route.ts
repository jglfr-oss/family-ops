import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendSms } from "@/lib/services/notifications";

/**
 * Reminder pass (?window=morning|afternoon|evening). Respects the pause flag
 * and skips children with nothing pending. With ENABLE_SMS_REMINDERS=false,
 * intent is logged with status skipped_flag_disabled and nothing is sent.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}` || !env.cronSecret)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const window = new URL(request.url).searchParams.get("window") ?? "morning";
  const admin = createAdminClient();
  const { data: households } = await admin
    .from("households")
    .select("id, timezone, household_settings(reminders_paused)");
  let logged = 0;

  for (const hh of households ?? []) {
    const settings = (hh.household_settings ?? null) as unknown as {
      reminders_paused: boolean;
    } | null;
    if (settings?.reminders_paused) continue;
    const today = todayInTimeZone(hh.timezone);

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
      // Duplicate suppression: one reminder per child per window per day.
      const { data: already } = await admin
        .from("reminder_log")
        .select("id")
        .eq("child_user_id", childId)
        .eq("reminder_type", `${window}:${today}`)
        .limit(1);
      if (already && already.length > 0) continue;

      const result = await sendSms(
        "",
        `You have ${count} chore${count === 1 ? "" : "s"} left today. You've got this!`
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
  return NextResponse.json({ ok: true, window, logged });
}
