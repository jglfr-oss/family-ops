import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function KidLeaderboard({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const profile = await requireChildSelf(childId);
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("household_settings")
    .select("leaderboard_enabled")
    .eq("household_id", profile.household_id!)
    .maybeSingle();
  if (settings && !settings.leaderboard_enabled) {
    return <p className="text-ink-muted">The leaderboard is turned off right now.</p>;
  }

  const [{ data: kids }, { data: scores }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", profile.household_id!)
      .eq("role", "child")
      .eq("active", true),
    supabase
      .from("score_events")
      .select("user_id, points")
      .eq("household_id", profile.household_id!),
  ]);

  const totals = (kids ?? [])
    .map((k) => ({
      ...k,
      points: (scores ?? [])
        .filter((s) => s.user_id === k.id)
        .reduce((sum, s) => sum + s.points, 0),
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <ol className="flex flex-col gap-2">
        {totals.map((k, idx) => (
          <li
            key={k.id}
            className="rounded-card border-line bg-card flex items-center justify-between border px-4 py-3"
          >
            <span className="font-semibold">
              {idx === 0 && totals.length > 1 && k.points > 0 ? "🏆 " : ""}
              {k.display_name} {k.id === profile.id ? "(you)" : ""}
            </span>
            <span className="text-spruce-deep font-semibold">{k.points} pts</span>
          </li>
        ))}
      </ol>
      <p className="text-ink-muted text-xs">Everyone&apos;s a winner when the chores get done.</p>
    </div>
  );
}
