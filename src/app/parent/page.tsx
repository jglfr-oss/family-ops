import type { Metadata } from "next";
import Link from "next/link";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/services/instances";
import { NotifyButton } from "./notify-button";

export const metadata: Metadata = { title: "Parent dashboard" };

export default async function ParentDashboard() {
  const parent = await requireParent();
  const supabase = await createClient();

  const { data: household } = await supabase
    .from("households")
    .select("name, timezone")
    .eq("id", parent.household_id!)
    .single();

  const today = todayInTimeZone(
    household?.timezone ?? "America/New_York",
  );

  const [
    { data: todays },
    { count: pendingApprovals },
    { data: children },
  ] = await Promise.all([
    supabase
      .from("chore_instances")
      .select("id, status, assigned_user_id")
      .eq("household_id", parent.household_id!)
      .eq("due_date", today),

    supabase
      .from("chore_instances")
      .select("id", { count: "exact", head: true })
      .eq("household_id", parent.household_id!)
      .eq("status", "completed"),

    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", parent.household_id!)
      .eq("role", "child")
      .eq("active", true),
  ]);

  const perChild = (children ?? []).map((child) => {
    const childChores = (todays ?? []).filter(
      (instance) => instance.assigned_user_id === child.id,
    );

    const completed = childChores.filter((instance) =>
      ["completed", "approved"].includes(instance.status),
    ).length;

    return {
      ...child,
      completed,
      total: childChores.length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {household?.name ?? "Household"} · today
      </h1>

      <section className="grid gap-4 sm:grid-cols-2">
        {perChild.map((child) => (
          <div
            key={child.id}
            className="rounded-card border-line bg-card border p-5"
          >
            <h2 className="font-semibold">{child.display_name}</h2>

            <p className="text-spruce-deep mt-1 text-2xl font-semibold">
              {child.completed}{" "}
              <span className="text-ink-muted text-base font-normal">
                of {child.total} complete
              </span>
            </p>

            <Link
              href={`/kids/${child.id}/today`}
              className="text-spruce mt-2 inline-block text-sm font-medium underline"
            >
              View their day
            </Link>
          </div>
        ))}

        {perChild.length === 0 && (
          <p className="text-ink-muted">
            No children found yet. Run the seed script, or add child
            profiles in Supabase.
          </p>
        )}
      </section>

      <section className="rounded-card border-line bg-card border p-5">
        <h2 className="font-semibold">Needs your attention</h2>

        <p className="text-ink-muted mt-2 text-sm">
          {pendingApprovals ?? 0} chore
          {(pendingApprovals ?? 0) === 1 ? "" : "s"} waiting for
          approval.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/parent/approvals"
            className="bg-spruce rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Review approvals
          </Link>

          <Link
            href="/parent/chores"
            className="border-line rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            Add a chore
          </Link>

          <Link
            href="/parent/schedules"
            className="border-line rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            Edit schedules
          </Link>

          <NotifyButton />
        </div>
      </section>
    </div>
  );
}
