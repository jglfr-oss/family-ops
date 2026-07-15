import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reliabilityScore } from "@/lib/services/scoring";
import { weekStart } from "@/lib/services/allowance";
import { todayInTimeZone } from "@/lib/services/instances";
import { EarningsHistory } from "../earnings-history";

export const metadata: Metadata = { title: "History" };

export default async function KidHistory({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  await requireChildSelf(childId);
  const supabase = await createClient();
  const { data: instances } = await supabase
    .from("chore_instances")
    .select("id, due_date, status, due_at, completed_at, chores(title)")
    .eq("assigned_user_id", childId)
    .order("due_date", { ascending: false })
    .limit(200);

  const { data: kid } = await supabase
    .from("profiles")
    .select("household_id, weekly_allowance")
    .eq("id", childId)
    .single();
  const { data: hh } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", kid?.household_id ?? "")
    .single();
  const curWeekStart = weekStart(todayInTimeZone(hh?.timezone ?? "America/New_York"));

  const score = reliabilityScore(instances ?? []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <section className="rounded-card border-line bg-card border p-5">
        <p className="text-ink-muted text-sm">Reliability score</p>
        <p className="text-spruce-deep text-3xl font-semibold">
          {score}
          <span className="text-ink-muted text-lg">/100</span>
        </p>
      </section>

      <EarningsHistory
        instances={instances ?? []}
        base={Number(kid?.weekly_allowance ?? 0)}
        currentWeekStart={curWeekStart}
      />

      <ul className="flex flex-col gap-2">
        {(instances ?? []).map((i) => (
          <li
            key={i.id}
            className="rounded-card border-line bg-card flex items-center justify-between border px-4 py-3 text-sm"
          >
            <span>
              {i.due_date} · {(i.chores as unknown as { title: string } | null)?.title}
            </span>
            <span className="text-ink-muted font-medium capitalize">{i.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
