import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInTimeZone } from "@/lib/services/instances";

/** Daily closeout: pending chores past today become missed (or get a make-up window). */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}` || !env.cronSecret)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, timezone");
  let missed = 0;
  let makeUps = 0;

  for (const hh of households ?? []) {
    const today = todayInTimeZone(hh.timezone);
    const { data: overdue } = await admin
      .from("chore_instances")
      .select("id, chore_schedule_id, make_up_due_at")
      .eq("household_id", hh.id)
      .eq("status", "pending")
      .lte("due_date", today);

    for (const i of overdue ?? []) {
      if (i.make_up_due_at && new Date() <= new Date(i.make_up_due_at)) continue; // window still open
      let makeUpHours: number | null = null;
      if (i.chore_schedule_id && !i.make_up_due_at) {
        const { data: sched } = await admin
          .from("chore_schedules")
          .select("make_up_allowed, make_up_deadline_hours")
          .eq("id", i.chore_schedule_id)
          .single();
        if (sched?.make_up_allowed) makeUpHours = sched.make_up_deadline_hours ?? 24;
      }
      if (makeUpHours) {
        await admin
          .from("chore_instances")
          .update({ make_up_due_at: new Date(Date.now() + makeUpHours * 3600_000).toISOString() })
          .eq("id", i.id)
          .eq("status", "pending");
        makeUps += 1;
      } else {
        await admin
          .from("chore_instances")
          .update({ status: "missed" })
          .eq("id", i.id)
          .eq("status", "pending");
        await admin.from("chore_instance_events").insert({
          chore_instance_id: i.id,
          event_type: "closeout_missed",
          previous_status: "pending",
          new_status: "missed",
        });
        missed += 1;
      }
    }
  }
  return NextResponse.json({ ok: true, missed, makeUps });
}
