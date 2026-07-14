import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveInstance } from "@/lib/actions";

async function approve(instanceId: string): Promise<void> {
  "use server";
  await approveInstance(instanceId);
}
import { RejectForm } from "./reject-form";
import { UndoCompletionForm } from "./undo-completion-form";
import { todayInTimeZone } from "@/lib/services/instances";
import { formatInZone } from "@/lib/format";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data: hh } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", parent.household_id!)
    .single();
  const tz = hh?.timezone ?? "America/New_York";
  const today = todayInTimeZone(tz);
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  const { data: waiting } = await supabase
    .from("chore_instances")
    .select(
      "id, due_date, completed_at, points_available, chores(title), profiles!chore_instances_assigned_user_id_fkey(display_name)"
    )
    .eq("household_id", parent.household_id!)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });
  const { data: recentDone } = await supabase
    .from("chore_instances")
    .select(
      "id, due_date, approved_at, points_available, chores(title), profiles!chore_instances_assigned_user_id_fkey(display_name)"
    )
    .eq("household_id", parent.household_id!)
    .eq("status", "approved")
    .gte("due_date", yesterday)
    .lte("due_date", today)
    .order("approved_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
      {(waiting ?? []).length === 0 && (
        <p className="text-ink-muted">Nothing waiting for approval. Nice.</p>
      )}
      <section className="flex flex-col gap-3">
        {(waiting ?? []).map((i) => {
          const chore = i.chores as unknown as { title: string } | null;
          const kid = i.profiles as unknown as { display_name: string } | null;
          return (
            <div key={i.id} className="rounded-card border-line bg-card border p-4">
              <h2 className="font-semibold">
                {chore?.title} — {kid?.display_name}
              </h2>
              <p className="text-ink-muted text-sm">
                Due {i.due_date} · marked done {formatInZone(i.completed_at, tz)} ·{" "}
                {i.points_available} pts
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <form action={approve.bind(null, i.id)}>
                  <button className="bg-spruce rounded-lg px-4 py-2 text-sm font-semibold text-white">
                    Approve
                  </button>
                </form>
                <RejectForm instanceId={i.id} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Recent completions (today &amp; yesterday)
        </h2>
        <p className="text-ink-muted -mt-2 text-sm">
          Approved by mistake, or marked done but not actually done? Undo sends it back to the
          child&apos;s list and removes the points. A reason is required and recorded.
        </p>
        {(recentDone ?? []).length === 0 && (
          <p className="text-ink-muted">Nothing approved yet today or yesterday.</p>
        )}
        {(recentDone ?? []).map((i) => {
          const chore = i.chores as unknown as { title: string } | null;
          const kid = i.profiles as unknown as { display_name: string } | null;
          return (
            <div key={i.id} className="rounded-card border-line bg-card border p-4">
              <h3 className="font-semibold">
                {chore?.title} — {kid?.display_name}
              </h3>
              <p className="text-ink-muted text-sm">
                Due {i.due_date} · approved {formatInZone(i.approved_at, tz)} · {i.points_available}{" "}
                pts
              </p>
              <div className="mt-3">
                <UndoCompletionForm instanceId={i.id} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
