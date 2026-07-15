import { buildWeeklyHistory, money } from "@/lib/services/allowance";
import type { ChoreInstance } from "@/lib/types";

export function EarningsHistory({
  instances,
  base,
  currentWeekStart,
}: {
  instances: Pick<ChoreInstance, "due_date" | "status" | "due_at" | "completed_at">[];
  base: number;
  currentWeekStart: string;
}) {
  if (base <= 0) return null;
  const weeks = buildWeeklyHistory(instances, base, currentWeekStart);
  if (weeks.length === 0) return null;

  const totalEarned = weeks.reduce((sum, w) => sum + w.earned, 0);

  return (
    <section className="rounded-card border-line bg-card border p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Allowance history</h2>
        <span className="text-ink-muted text-xs">Last {weeks.length} weeks</span>
      </div>
      <p className="text-ink-muted mt-1 text-sm">
        Earned across these weeks:{" "}
        <strong className="text-spruce-deep">{money(totalEarned)}</strong>
      </p>

      <div className="mt-3 space-y-2">
        {weeks.map((w) => (
          <div
            key={w.weekStart}
            className="border-line flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium">
                {w.weekStart} – {w.weekEnd}
              </p>
              <p className="text-ink-muted text-xs">
                {w.reliability}% reliable · {w.tierLabel} · {w.done}/{w.total} done
              </p>
            </div>
            <p className="text-spruce-deep text-lg font-semibold whitespace-nowrap">
              {money(w.earned)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
