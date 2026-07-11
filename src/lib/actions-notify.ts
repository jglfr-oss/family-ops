"use server";

import { requireParent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendSms } from "@/lib/services/notifications";
import { SMS_BRAND } from "@/lib/services/sms-brand";
import type { ActionState } from "@/lib/actions";

export type NotifyResult = ActionState & { sent?: number };

/**
 * Parent-triggered, immediate SMS to every child who still has pending chores
 * today. Intentionally ignores quiet hours and window dedupe (a parent pressed
 * the button on purpose), but every send is written to reminder_log.
 */
export async function textKidsNow(): Promise<NotifyResult> {
  const parent = await requireParent();
  const admin = createAdminClient();

  const { data: household } = await admin
    .from("households")
    .select("id, timezone")
    .eq("id", parent.household_id!)
    .single();
  if (!household) return { error: "Household not found." };
  const today = todayInTimeZone(household.timezone);

  const { data: pendings } = await admin
    .from("chore_instances")
    .select("assigned_user_id, chores(title)")
    .eq("household_id", household.id)
    .eq("due_date", today)
    .eq("status", "pending");

  const byChild = new Map<string, string[]>();
  for (const i of pendings ?? []) {
    const title = ((i.chores as unknown as { title: string } | null)?.title ?? "a chore").trim();
    const list = byChild.get(i.assigned_user_id) ?? [];
    list.push(title);
    byChild.set(i.assigned_user_id, list);
  }
  if (byChild.size === 0) return { ok: true, sent: 0 };

  let sent = 0;
  for (const [childId, titles] of byChild) {
    const { data: child } = await admin
      .from("profiles")
      .select("display_name, phone_number")
      .eq("id", childId)
      .single();
    if (!child?.phone_number) continue;

    const shown = titles.slice(0, 4).join(", ");
    const more = titles.length > 4 ? ` +${titles.length - 4} more` : "";
    const result = await sendSms(
      child.phone_number,
      `${SMS_BRAND}: ${child.display_name}, still to do today: ${shown}${more}. Reply STOP to opt out.`
    );
    await admin.from("reminder_log").insert({
      household_id: household.id,
      child_user_id: childId,
      reminder_type: `manual:${today}:${Date.now()}`,
      delivery_channel: "sms",
      delivery_status: result.status,
      provider_message_id: result.providerMessageId,
      error_message: result.error,
    });
    if (result.status === "sent") sent += 1;
  }
  return { ok: true, sent };
}
