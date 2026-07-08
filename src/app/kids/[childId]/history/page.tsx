import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reliabilityScore } from "@/lib/services/scoring";

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
    .limit(60);

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
