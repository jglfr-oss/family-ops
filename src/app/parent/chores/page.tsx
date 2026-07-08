import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setChoreActive, archiveChore } from "@/lib/actions";
import { ChoreForm } from "./chore-form";

export const metadata: Metadata = { title: "Chores" };

export default async function ChoresPage() {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data: chores } = await supabase
    .from("chores")
    .select("id, title, description, default_points, requires_approval, active, archived_at")
    .eq("household_id", parent.household_id!)
    .is("archived_at", null)
    .order("title");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Chores</h1>
      <ChoreForm />
      <section className="flex flex-col gap-3">
        {(chores ?? []).map((c) => (
          <div key={c.id} className="rounded-card border-line bg-card border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  {c.title}{" "}
                  {!c.active && (
                    <span className="text-ink-muted text-xs font-medium">(paused)</span>
                  )}
                </h2>
                {c.description && <p className="text-ink-muted text-sm">{c.description}</p>}
                <p className="text-ink-muted mt-1 text-xs">
                  {c.default_points} pts{c.requires_approval ? " · needs approval" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={setChoreActive.bind(null, c.id, !c.active)}>
                  <button className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium">
                    {c.active ? "Pause" : "Reactivate"}
                  </button>
                </form>
                <form action={archiveChore.bind(null, c.id)}>
                  <button className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium text-red-700">
                    Archive
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {(chores ?? []).length === 0 && (
          <p className="text-ink-muted">No chores yet — add the first one above.</p>
        )}
      </section>
    </div>
  );
}
