import type { ChoreInstance } from "@/lib/types";

export const POINTS = {
  onTime: 10,
  lateButBeforeCloseout: 7,
  fiveDayStreakBonus: 10,
  perfectWeekBonus: 25,
} as const;

/** Points for an approved instance based on when it was completed. */
export function pointsForCompletion(instance: {
  points_available: number;
  due_at: string | null;
  completed_at: string | null;
}): number {
  if (!instance.completed_at) return 0;
  const base = instance.points_available ?? POINTS.onTime;
  if (!instance.due_at) return base;
  return new Date(instance.completed_at) <= new Date(instance.due_at)
    ? base
    : Math.min(base, POINTS.lateButBeforeCloseout);
}

const DONE: ReadonlySet<string> = new Set(["completed", "approved"]);
const COUNTABLE: ReadonlySet<string> = new Set([
  "completed",
  "approved",
  "missed",
  "rejected",
  "pending",
]);

/**
 * Streak: consecutive days (ending at the most recent day with any countable
 * chores) on which every countable chore was done. Excused/waived days are
 * skipped entirely — they never break a streak.
 */
export function currentStreak(instances: Pick<ChoreInstance, "due_date" | "status">[]): number {
  const byDay = new Map<string, { total: number; done: number }>();
  for (const i of instances) {
    if (!COUNTABLE.has(i.status)) continue;
    const day = byDay.get(i.due_date) ?? { total: 0, done: 0 };
    day.total += 1;
    if (DONE.has(i.status)) day.done += 1;
    byDay.set(i.due_date, day);
  }
  const days = [...byDay.keys()].sort().reverse();
  let streak = 0;
  for (const d of days) {
    const { total, done } = byDay.get(d)!;
    if (done === total && total > 0) streak += 1;
    else if (streak === 0 && done < total && days[0] === d) return 0;
    else break;
  }
  return streak;
}

/**
 * Reliability score 0–100: completion 50%, on-time 30%, consistency 20%.
 * Excused and waived instances are excluded from all denominators.
 */
export function reliabilityScore(
  instances: Pick<ChoreInstance, "due_date" | "status" | "due_at" | "completed_at">[]
): number {
  const countable = instances.filter((i) => COUNTABLE.has(i.status) && i.status !== "pending");
  if (countable.length === 0) return 0;
  const done = countable.filter((i) => DONE.has(i.status));
  const completionRate = done.length / countable.length;
  const withDue = done.filter((i) => i.due_at && i.completed_at);
  const onTimeRate =
    withDue.length === 0
      ? completionRate
      : withDue.filter((i) => new Date(i.completed_at!) <= new Date(i.due_at!)).length /
        withDue.length;
  // Consistency: the current streak measured against how many days actually had
  // chores (capped at a week). A flawless 3-day week is fully consistent — it
  // should not be penalised for the calendar being short.
  const daysWithChores = new Set(countable.map((i) => i.due_date)).size;
  const streak = currentStreak(instances);
  const consistency = daysWithChores === 0 ? 1 : Math.min(streak / Math.min(daysWithChores, 7), 1);
  return Math.round((completionRate * 0.5 + onTimeRate * 0.3 + consistency * 0.2) * 100);
}
