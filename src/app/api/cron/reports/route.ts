import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";
import { sendEmail } from "@/lib/services/notifications";

/**
 * Report pass (?type=daily|weekly|monthly). With ENABLE_EMAIL_REPORTS=false,
 * a summary is computed and logged with status skipped_flag_disabled.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}` || !env.cronSecret)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type") ?? "daily";
  const recipients = (process.env.PARENT_REPORT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, name, timezone");
  let logged = 0;

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
  }
  return NextResponse.json({ ok: true, type, logged });
}
