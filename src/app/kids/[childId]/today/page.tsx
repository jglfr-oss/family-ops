import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone, localDateTimeToUtcIso } from "@/lib/services/instances";
import { currentStreak } from "@/lib/services/scoring";
import { formatTimeInZone } from "@/lib/format";
import { CompleteButton, UndoButton } from "./complete-button";
import { PushToggle } from "@/components/push-toggle";
import { EarningsCard } from "../earnings-card";
import { weekStart, weekEnd } from "@/lib/services/allowance";

export const metadata: Metadata = { title: "Today" };

const DONE = new Set(["completed", "approved"]);
const LABEL: Record<string, string> = {
  pending: "To do",
  completed: "Waiting for approval",
  approved: "Approved",
  rejected: "Try again",
  missed: "Missed",
  excused: "Excused",
  waived: "Waived",
};

export default async function KidToday({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  await requireChildSelf(childId);
  const supabase = await createClient();

  const { data: kid } = await supabase
    .from("profiles")
    .select("display_name, household_id, weekly_allowance")
    .eq("id", childId)
    .single();
  const { data: household } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", kid?.household_id ?? "")
    .single();
  const tz = household?.timezone ?? "America/New_York";
  const today = todayInTimeZone(tz);

  const wkStart = weekStart(today);
  const wkEnd = weekEnd(today);

  const [{ data: instances }, { data: recent }, { data: scores }, { data: weekInstances }] =
    await Promise.all([
      supabase
        .from("chore_instances")
        .select("id, status, due_at, points_available, parent_note, chores(title, description)")
        .eq("assigned_user_id", childId)
        .eq("due_date", today)
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("chore_instances")
        .select("due_date, status")
        .eq("assigned_user_id", childId)
        .lte("due_date", today)
        .order("due_date", { ascending: false })
        .limit(200),
      supabase
        .from("score_events")
        .select("points, occurred_at")
        .eq("user_id", childId)
        .gte("occurred_at", `${localDateTimeToUtcIso(today, "00:00", tz)}`),
      supabase
        .from("chore_instances")
        .select("due_date, status, due_at, completed_at")
        .eq("assigned_user_id", childId)
        .gte("due_date", wkStart)
        .lte("due_date", wkEnd),
    ]);

  const list = instances ?? [];
  const doneCount = list.filter((i) => DONE.has(i.status)).length;
  const pointsToday = (scores ?? []).reduce((sum, s) => sum + s.points, 0);
  const streak = currentStreak(recent ?? []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card bg-spruce-deep px-6 py-8 text-white">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {kid?.display_name ?? "there"}!
        </h1>
        <p className="mt-2 text-lg">
          <span className="text-sun font-semibold">
            {doneCount} of {list.length}
          </span>{" "}
          complete today
        </p>
        <p className="mt-1 text-sm text-white/80">
          {pointsToday} points today · {streak}-day streak {streak >= 5 ? "🔥" : ""}
        </p>
      </section>

      <EarningsCard
        instances={weekInstances ?? []}
        base={Number(kid?.weekly_allowance ?? 0)}
        weekLabel={`${wkStart} – ${wkEnd}`}
      />

      <PushToggle />

      <section className="flex flex-col gap-3">
        {list.map((i) => {
          const chore = i.chores as unknown as { title: string; description: string | null } | null;
          return (
            <div key={i.id} className="rounded-card border-line bg-card border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{chore?.title}</h2>
                  {chore?.description && (
                    <p className="text-ink-muted text-sm">{chore.description}</p>
                  )}
                  <p className="text-ink-muted mt-1 text-xs">
                    {LABEL[i.status]}
                    {i.due_at ? ` · due ${formatTimeInZone(i.due_at, tz)}` : ""}
                    {" · "}
                    {i.points_available} pts
                  </p>
                  {i.status === "pending" && i.parent_note && (
                    <p className="mt-1 text-xs text-red-700">Note from a parent: {i.parent_note}</p>
                  )}
                </div>
                {i.status === "pending" ? (
                  <CompleteButton instanceId={i.id} />
                ) : (
                  <span aria-hidden className="text-2xl">
                    {DONE.has(i.status) ? "✅" : "•"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="text-ink-muted">No chores today — enjoy the day off!</p>
        )}
      </section>
    </div>
  );
}
