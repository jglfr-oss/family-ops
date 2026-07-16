import { money, summarizeWeek, type WeekSummary } from "@/lib/services/allowance";
import type { ChoreInstance } from "@/lib/types";

export function EarningsCard({
  instances,
  base,
  weekLabel,
  inProgress = true,
}: {
  instances: Pick<ChoreInstance, "due_date" | "status" | "due_at" | "completed_at">[];
  base: number;
  weekLabel: string;
  inProgress?: boolean;
}) {
  if (base <= 0) return null;
  const s: WeekSummary = summarizeWeek(instances, base);
  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 100;

  return (
    <section className="rounded-card border-line bg-card border p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {inProgress ? "This week so far" : "This week's allowance"}
        </h2>
        <span className="text-ink-muted text-xs">{weekLabel}</span>
      </div>

      <p className="text-spruce-deep mt-2 text-3xl font-semibold">
        {inProgress ? "On track for " : ""}
        {money(inProgress ? s.maxPossible : s.earned)}
        <span className="text-ink-muted text-base font-normal"> of {money(s.base)}</span>
      </p>
      <p className="text-ink-muted mt-1 text-sm">
        {s.reliability}% reliable so far · {s.tier.label} · {s.done} of {s.total} chores done
      </p>
      {inProgress && (
        <p className="text-ink-muted mt-1 text-xs">
          Not final until the week ends on Saturday — keep completing chores to lock in your
          allowance.
        </p>
      )}

      <div className="bg-spruce-soft mt-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-spruce h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      {s.remaining > 0 && s.upside > 0 && (
        <p className="mt-3 text-sm">
          Finish your {s.remaining} remaining chore{s.remaining === 1 ? "" : "s"} this week and
          you&apos;ll earn <strong>{money(s.maxPossible)}</strong>{" "}
          <span className="text-ink-muted">(+{money(s.upside)})</span>.
        </p>
      )}
      {s.remaining > 0 && s.upside === 0 && (
        <p className="mt-3 text-sm">
          You&apos;re on track for the full <strong>{money(s.maxPossible)}</strong> — keep it up!
        </p>
      )}
      {s.remaining === 0 && s.earned === s.base && (
        <p className="text-spruce mt-3 text-sm font-medium">
          Perfect week — you&apos;ve earned the full {money(s.base)}! 🎉
        </p>
      )}
      {s.remaining === 0 && s.earned < s.base && s.nextTier && (
        <p className="text-ink-muted mt-3 text-sm">
          Next week, {s.nextTier.needed}% reliability earns {money(s.nextTier.earned)}.
        </p>
      )}
    </section>
  );
}
