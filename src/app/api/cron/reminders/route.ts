import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendSms } from "@/lib/services/notifications";
import { sendPushToUser } from "@/lib/services/push";
import { isPaused, isQuietTime, type ReminderSettings } from "@/lib/services/reminder-rules";
import { SMS_BRAND } from "@/lib/services/sms-brand";

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
  let pushed = 0;

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
      .select(
        "id, assigned_user_id, chore_schedule_id, chores(title), chore_schedules!inner(reminder_eligible)"
      )
      .eq("household_id", hh.id)
      .eq("due_date", today)
      .eq("status", "pending")
      .eq("chore_schedules.reminder_eligible", true);

    const byChild = new Map<string, string[]>();
    for (const i of pendings ?? []) {
      const title = ((i.chores as unknown as { title: string } | null)?.title ?? "a chore").trim();
      const list = byChild.get(i.assigned_user_id) ?? [];
      list.push(title);
      byChild.set(i.assigned_user_id, list);
    }

    for (const [childId, titles] of byChild) {
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

      const count = titles.length;
      const shown = titles.slice(0, 4).join(", ");
      const more = count > 4 ? ` +${count - 4} more` : "";
      const name = child?.display_name ?? "Hey";
      const optOut =
        window === "morning" ? " Reply STOP to opt out, HELP for help." : " Reply STOP to opt out.";
      const verb = window === "morning" ? "today" : "left today";
      const result = await sendSms(
        child?.phone_number ?? "",
        `${SMS_BRAND}: Hi ${name}! ${count} chore${count === 1 ? "" : "s"} ${verb}: ${shown}${more}.${optOut}`
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

      // Push runs alongside SMS; it is best-effort and never blocks.
      const push = await sendPushToUser(
        childId,
        `${count} chore${count === 1 ? "" : "s"} ${verb}`,
        `${shown}${more}`,
        `/kids/${childId}/today`
      );
      if (push.sent > 0) {
        pushed += push.sent;
        await admin.from("reminder_log").insert({
          household_id: hh.id,
          child_user_id: childId,
          reminder_type: `${window}:${today}`,
          delivery_channel: "push",
          delivery_status: "sent",
        });
      }
    }

    // Morning pass also sends parents a day overview.
    if (window === "morning" && byChild.size > 0) {
      const { data: parents } = await admin
        .from("profiles")
        .select("id, phone_number")
        .eq("household_id", hh.id)
        .eq("role", "parent")
        .eq("active", true);
      const { data: kidNames } = await admin
        .from("profiles")
        .select("id, display_name")
        .eq("household_id", hh.id)
        .eq("role", "child");
      const nameOf = new Map((kidNames ?? []).map((k) => [k.id, k.display_name]));
      const overview = [...byChild.entries()]
        .map(([kid, titles]) => `${nameOf.get(kid) ?? "?"} ${titles.length}`)
        .join(", ");

      for (const parent of parents ?? []) {
        const { data: already } = await admin
          .from("reminder_log")
          .select("id")
          .eq("child_user_id", parent.id)
          .eq("reminder_type", `morning_parent:${today}`)
          .limit(1);
        if (already && already.length > 0) continue;

        // SMS only to parents with a phone number.
        if (parent.phone_number) {
          const result = await sendSms(
            parent.phone_number,
            `${SMS_BRAND} today: ${overview} chores on deck. Reply STOP to opt out.`
          );
          await admin.from("reminder_log").insert({
            household_id: hh.id,
            child_user_id: parent.id,
            reminder_type: `morning_parent:${today}`,
            delivery_channel: "sms",
            delivery_status: result.status,
            provider_message_id: result.providerMessageId,
            error_message: result.error,
          });
          logged += 1;
        }

        // Push to every parent device.
        const push = await sendPushToUser(
          parent.id,
          "Choreo — today",
          `${overview} chores on deck.`,
          "/parent"
        );
        if (push.sent > 0) {
          pushed += push.sent;
          await admin.from("reminder_log").insert({
            household_id: hh.id,
            child_user_id: parent.id,
            reminder_type: `morning_parent_push:${today}`,
            delivery_channel: "push",
            delivery_status: "sent",
          });
        }
      }
    }
  }
  return NextResponse.json({ ok: true, window, logged, pushed, skippedQuiet, skippedPaused });
}
