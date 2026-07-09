import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendEmail, sendSms } from "@/lib/services/notifications";

/**
 * Report pass (?type=daily|weekly|monthly).
 * - Email reports remain flag-gated stubs (ENABLE_EMAIL_REPORTS).
 * - The daily pass also sends each parent (with a phone number) one SMS
 *   digest: per-child completion today + pending approval count. Uses the
 *   same ENABLE_SMS_REMINDERS flag and Twilio credentials as kid reminders.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}` || !env.cronSecret)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "daily";
  const recipients = (process.env.PARENT_REPORT_RECIPIENTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, name, timezone");
  let logged = 0;
  let digests = 0;

  for (const hh of households ?? []) {
    const today = todayInTimeZone(hh.timezone);
    const back = type === "monthly" ? 30 : type === "weekly" ? 7 : 1;
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (back - 1));
    const startStr = start.toISOString().slice(0, 10);

    const { data: instances } = await admin
      .from("chore_instances")
      .select("status")
      .eq("household_id", hh.id)
      .gte("due_date", startStr)
      .lte("due_date", today);
    const counts: Record<string, number> = {};
    for (const i of instances ?? []) counts[i.status] = (counts[i.status] ?? 0) + 1;

    // ----- Email report (flag-gated; Resend not yet wired) -----
    const html = `<h1>${hh.name} — ${type} report</h1><p>${startStr} to ${today}</p><pre>${JSON.stringify(counts, null, 2)}</pre>`;
    for (const to of recipients.length ? recipients : ["(no recipients configured)"]) {
      const result = await sendEmail(to, `Family Ops ${type} report`, html);
      await admin.from("report_log").insert({
        household_id: hh.id,
        report_type: type,
        period_start: startStr,
        period_end: today,
        recipient: to,
        delivery_status: result.status,
        provider_message_id: result.providerMessageId,
        error_message: result.error,
      });
      logged += 1;
    }

    // ----- Daily SMS digest to parents -----
    if (type !== "daily") continue;

    const [{ data: members }, { data: todays }, { count: awaiting }] = await Promise.all([
      admin.from("profiles").select("id, role, display_name, phone_number, active").eq("household_id", hh.id).eq("active", true),
      admin.from("chore_instances").select("assigned_user_id, status").eq("household_id", hh.id).eq("due_date", today),
      admin.from("chore_instances").select("id", { count: "exact", head: true }).eq("household_id", hh.id).eq("status", "completed"),
    ]);

    const kids = (members ?? []).filter((m) => m.role === "child");
    const parents = (members ?? []).filter((m) => m.role === "parent" && m.phone_number);
    if (parents.length === 0 || kids.length === 0) continue;

    const done = new Set(["completed", "approved"]);
    const skip = new Set(["excused", "waived"]);
    const perChild = kids.map((k) => {
      const mine = (todays ?? []).filter((i) => i.assigned_user_id === k.id && !skip.has(i.status));
      return `${k.display_name} ${mine.filter((i) => done.has(i.status)).length}/${mine.length}`;
    });
    const approvalNote = (awaiting ?? 0) > 0 ? ` ${awaiting} awaiting approval.` : "";
    const body = `Family Ops today: ${perChild.join(", ")}.${approvalNote}`;

    for (const parent of parents) {
      // One digest per parent per day.
      const { data: already } = await admin
        .from("report_log")
        .select("id")
