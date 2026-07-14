import type { ChoreInstance } from "@/lib/types";
import { reliabilityScore } from "@/lib/services/scoring";

/**
 * Reliability-scaled allowance. A child's base allowance is multiplied by the
 * tier their week's reliability falls into, so consistency — not chore count —
 * determines pay. Excused and waived chores never count against them.
 */
export const TIERS = [
  { min: 90, rate: 1.0, label: "Excellent" },
  { min: 75, rate: 0.85, label: "Good" },
  { min: 50, rate: 0.65, label: "Needs work" },
  { min: 0, rate: 0.4, label: "Rough week" },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierFor(reliability: number): Tier {
  return TIERS.find((t) => reliability >= t.min) ?? TIERS[TIERS.length - 1];
}

export function earnedFor(base: number, reliability: number): number {
  const rate = tierFor(reliability).rate;
  return Math.round(base * rate * 100) / 100;
}

/** Sunday of the week containing `dateOnly` (YYYY-MM-DD). */
export function weekStart(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // 0 = Sunday
  return d.toISOString().slice(0, 10);
}

/** Saturday of the week containing `dateOnly`. */
export function weekEnd(dateOnly: string): string {
  const d = new Date(`${weekStart(dateOnly)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export type WeekSummary = {
  reliability: number;
  tier: Tier;
  base: number;
  earned: number;
  maxPossible: number;
  total: number;
  done: number;
  remaining: number;
  /** Dollars still reachable if every remaining chore gets done. */
  upside: number;
  nextTier: { needed: number; earned: number } | null;
};

/**
 * Summarize a child's week: what they've earned so far, and — the motivating
 * part — what they'd earn if they finish everything still pending.
 */
export function summarizeWeek(
  instances: Pick<ChoreInstance, "due_date" | "status" | "due_at" | "completed_at">[],
  base: number
): WeekSummary {
  const SKIP = new Set(["excused", "waived"]);
  const DONE = new Set(["completed", "approved"]);
  const countable = instances.filter((i) => !SKIP.has(i.status));
  const done = countable.filter((i) => DONE.has(i.status)).length;
  const remaining = countable.filter((i) => i.status === "pending").length;

  const reliability = reliabilityScore(instances);
  const tier = tierFor(reliability);
  const earned = earnedFor(base, reliability);

  // If every pending chore were completed on time, what would reliability be?
  const optimistic = instances.map((i) =>
    i.status === "pending"
      ? { ...i, status: "approved" as const, completed_at: i.due_at ?? i.completed_at }
      : i
  );
  const bestReliability = reliabilityScore(optimistic);
  const maxPossible = earnedFor(base, bestReliability);

  // What's the next tier up, and what would it pay?
  const currentIdx = TIERS.findIndex((t) => t.min === tier.min);
  const next = currentIdx > 0 ? TIERS[currentIdx - 1] : null;

  return {
    reliability,
    tier,
    base,
    earned,
    maxPossible,
    total: countable.length,
    done,
    remaining,
    upside: Math.round((maxPossible - earned) * 100) / 100,
    nextTier: next ? { needed: next.min, earned: Math.round(base * next.rate * 100) / 100 } : null,
  };
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
