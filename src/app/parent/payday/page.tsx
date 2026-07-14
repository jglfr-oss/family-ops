import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/services/instances";
import { money, summarizeWeek, weekEnd, weekStart, TIERS } from "@/lib/services/allowance";
import type { ChoreInstance } from "@/lib/types";

export const metadata: Metadata = { title: "Payday" };

type WeekRow = Pick<ChoreInstance, "due_date" | "status" | "due_at" | "completed_at"> & {
  assigned_user_id: string;
  chores: { title: string } | { title: string }[] | null;
};

function titleOf(i: WeekRow): string {
  const c = i.chores;
  if (!c) return "a chore";
  return Array.isArray(c) ? (c[0]?.title ?? "a chore") : c.title;
}

export default async function PaydayPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const parent = await requireParent();
  const { week } = await searchParams;
  const supabase = await createClient();

  const { data: hh } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", parent.household_id!)
    .single();
  const today = todayInTimeZone(hh?.timezone ?? "America/New_York");

  // ?week=prev shows last week (the usual payday view on a Sunday morning).
  const anchor =
    week === "prev"
      ? (() => {
          const d = new Date(`${weekStart(today)}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - 1);
          return d.toISOString().slice(0, 10);
        })()
      : today;
  const wkStart = weekStart(anchor);
  const wkEnd = weekEnd(anchor);

  const [{ data: kids }, { data: rows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, weekly_allowance")
      .eq("household_id", parent.household_id!)
      .eq("role", "child")
      .eq("active", true)
      .order("display_name"),
    supabase
      .from("chore_instances")
      .select("assigned_user_id, due_date, status, due_at, completed_at, chores(title)")
      .eq("household_id", parent.household_id!)
      .gte("due_date", wkStart)
      .lte("due_date", wkEnd),
  ]);

  const instances = (rows ?? []) as unknown as WeekRow[];
  const cards = (kids ?? []).map((kid) => {
    const mine = instances.filter((i) => i.assigned_user_id === kid.id);
    const summary = summarizeWeek(mine, Number(kid.weekly_allowance ?? 0));
    const missed = mine.filter((i) => i.status === "missed" || i.status === "rejected");
    return { kid, summary, missed };
  });

  const total = cards.reduce((sum, c) => sum + c.summary.earned, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Payday</h1>
        <div className="flex gap-1">
          <a
            href="/parent/payday"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${week !== "prev" ? "bg-spruce-soft text-spruce-deep" : "text-ink-muted"}`}
          >
            This week
          </a>
          <a
            href="/parent/payday?week=prev"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${week === "prev" ? "bg-spruce-soft text-spruce-deep" : "text-ink-muted"}`}
          >
            Last week
          </a>
        </div>
      </div>
      <p className="text-ink-muted -mt-4 text-sm">
        {wkStart} – {wkEnd} (Sunday to Saturday)
      </p>

      {cards.map(({ kid, summary, missed }) => (
        <section key={kid.id} className="rounded-card border-line bg-card border p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{kid.display_name}</h2>
            <p className="text-spruce-deep text-2xl font-semibold">
              {money(summary.earned)}
              <span className="text-ink-muted text-sm font-normal"> of {money(summary.base)}</span>
            </p>
          </div>
          <p className="text-ink-muted mt-1 text-sm">
            {summary.reliability}% reliable ({summary.tier.label}) · {summary.done} of{" "}
            {summary.total} chores done
            {summary.remaining > 0 ? ` · ${summary.remaining} still pending` : ""}
          </p>

          {missed.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium">
                {missed.length} missed or rejected
              </summary>
              <ul className="mt-2 space-y-1">
                {missed.map((m, idx) => (
                  <li key={idx} className="text-ink-muted text-sm">
                    {m.due_date} · {titleOf(m)} <span className="capitalize">({m.status})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {summary.base === 0 && (
            <p className="mt-3 text-sm text-red-700">
              No weekly allowance set — add one in Settings.
            </p>
          )}
        </section>
      ))}

      <section className="rounded-card border-line bg-card border p-5">
        <p className="font-semibold">
          Total to pay: <span className="text-spruce-deep">{money(total)}</span>
        </p>
        <div className="mt-3">
          <p className="text-ink-muted text-xs font-medium">How it works</p>
          <ul className="mt-1 space-y-0.5">
            {TIERS.map((t) => (
              <li key={t.min} className="text-ink-muted text-xs">
                {t.min}%+ reliability → {Math.round(t.rate * 100)}% of allowance ({t.label})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
