import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveInstance } from "@/lib/actions";

async function approve(instanceId: string): Promise<void> {
  "use server";
  await approveInstance(instanceId);
}
import { RejectForm } from "./reject-form";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data: waiting } = await supabase
    .from("chore_instances")
    .select(
      "id, due_date, completed_at, points_available, chores(title), profiles!chore_instances_assigned_user_id_fkey(display_name)"
    )
    .eq("household_id", parent.household_id!)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

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
                Due {i.due_date} · marked done{" "}
                {i.completed_at ? new Date(i.completed_at).toLocaleString() : ""} ·{" "}
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
    </div>
  );
}
