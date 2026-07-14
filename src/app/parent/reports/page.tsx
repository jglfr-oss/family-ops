import type { Metadata } from "next";
import Link from "next/link";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/services/instances";
import {
  currentStreak,
  pointsForCompletion,
  reliabilityScore,
} from "@/lib/services/scoring";
import type { InstanceStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Child reports" };

const REPORT_RANGES = [7, 30, 90] as const;
const DONE = new Set<InstanceStatus>(["completed", "approved"]);
const EXCLUDED = new Set<InstanceStatus>(["excused", "waived"]);

type ReportInstance = {
  id: string;
  assigned_user_id: string;
  due_date: string;
  due_at: string | null;
  status: InstanceStatus;
  points_available: number;
  completed_at: string | null;
  parent_note: string | null;
  chores: { title: string } | { title: string }[] | null;
};

function offsetDate(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function formatDate(dateOnly: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateOnly}T00:00:00Z`));
}

function choreTitle(instance: ReportInstance): string {
  if (Array.isArray(instance.chores)) {
    return instance.chores[0]?.title ?? "Chore";
  }

  return instance.chores?.title ?? "Chore";
}

function statusLabel(status: InstanceStatus): string {
  return status.replaceAll("_", " ");
}

export default async function ParentReports({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const parent = await requireParent();
  const supabase = await createClient();

  const requestedDays = Number((await searchParams).days);

  const days = REPORT_RANGES.includes(
    requestedDays as (typeof REPORT_RANGES)[number],
  )
    ? requestedDays
    : 30;

  const { data: household } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", parent.household_id!)
    .single();

  const endDate = todayInTimeZone(
    household?.timezone ?? "America/New_York",
  );

  const startDate = offsetDate(endDate, -(days - 1));

  const [{ data: children }, { data: rawInstances }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", parent.household_id!)
      .eq("role", "child")
      .eq("active", true)
      .order("display_name"),

    supabase
      .from("chore_instances")
      .select(
        "id, assigned_user_id, due_date, due_at, status, points_available, completed_at, parent_note, chores(title)",
      )
      .eq("household_id", parent.household_id!)
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .order("due_date", { ascending: false }),
  ]);

  const instances = (rawInstances ?? []) as unknown as ReportInstance[];

  const reports = (children ?? []).map((child) => {
    const mine = instances.filter(
      (instance) => instance.assigned_user_id === child.id,
    );

    const countable = mine.filter(
      (instance) => !EXCLUDED.has(instance.status),
    );

    const closed = countable.filter(
      (instance) => instance.status !== "pending",
    );

    const completed = closed.filter((instance) =>
      DONE.has(instance.status),
    );

    const missedRejected = mine.filter(
      (instance) =>
        instance.status === "missed" ||
        instance.status === "rejected",
    );

    const withDeadlines = completed.filter(
      (instance) => instance.due_at && instance.completed_at,
    );

    const onTime = withDeadlines.filter(
      (instance) =>
        new Date(instance.completed_at!).getTime() <=
        new Date(instance.due_at!).getTime(),
    );

    const completionRate = percentage(
      completed.length,
      closed.length,
    );

    const onTimeRate =
      withDeadlines.length > 0
        ? percentage(onTime.length, withDeadlines.length)
        : completionRate;

    const points = completed.reduce(
      (total, instance) =>
        total + pointsForCompletion(instance),
      0,
    );

    const statusCounts = mine.reduce<Record<InstanceStatus, number>>(
      (counts, instance) => {
        counts[instance.status] += 1;
        return counts;
      },
      {
        pending: 0,
        completed: 0,
        approved: 0,
        rejected: 0,
        missed: 0,
        excused: 0,
        waived: 0,
      },
    );

    return {
      ...child,
      assigned: countable.length,
      completed: completed.length,
      missed: statusCounts.missed + statusCounts.rejected,
      missedRejected,
      pending: statusCounts.pending,
      excused: statusCounts.excused + statusCounts.waived,
      completionRate,
      onTimeRate,
      points,
      reliability: reliabilityScore(mine),
      streak: currentStreak(mine),
      recent: mine.slice(0, 5),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Child reports
          </h1>

          <p className="text-ink-muted mt-1 text-sm">
            Performance from {formatDate(startDate)} through{" "}
            {formatDate(endDate)}.
          </p>
        </div>

        <nav aria-label="Report range" className="flex gap-2">
          {REPORT_RANGES.map((range) => {
            const active = range === days;

            return (
              <Link
                key={range}
                href={`/parent/reports?days=${range}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-spruce rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    : "border-line bg-card rounded-lg border px-3 py-2 text-sm font-semibold"
                }
              >
                {range} days
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {reports.map((report) => (
          <article
            key={report.id}
            className="rounded-card border-line bg-card border p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {report.display_name}
                </h2>

                <p className="text-ink-muted mt-1 text-sm">
                  {report.assigned} assigned chores
                </p>
              </div>

              <div className="text-right">
                <p className="text-ink-muted text-xs font-medium tracking-wide uppercase">
                  Reliability
                </p>

                <p className="text-spruce-deep text-3xl font-semibold">
                  {report.reliability}
                  <span className="text-ink-muted text-base font-normal">
                    /100
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">Completion</span>

                <span className="text-ink-muted">
                  {report.completed} of {report.assigned} ·{" "}
                  {report.completionRate}%
                </span>
              </div>

              <div className="bg-spruce-soft h-2 overflow-hidden rounded-full">
                <div
                  className="bg-spruce h-full rounded-full"
                  style={{
                    width: `${report.completionRate}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-spruce-soft rounded-lg p-3">
                <p className="text-ink-muted text-xs">
                  On time
                </p>

                <p className="text-spruce-deep mt-1 text-xl font-semibold">
                  {report.onTimeRate}%
                </p>
              </div>

              <div className="bg-spruce-soft rounded-lg p-3">
                <p className="text-ink-muted text-xs">
                  Current streak
                </p>

                <p className="text-spruce-deep mt-1 text-xl font-semibold">
                  {report.streak} day
                  {report.streak === 1 ? "" : "s"}
                </p>
              </div>

              <div className="bg-spruce-soft rounded-lg p-3">
                <p className="text-ink-muted text-xs">
                  Points
                </p>

                <p className="text-spruce-deep mt-1 text-xl font-semibold">
                  {report.points}
                </p>
              </div>

              <details className="bg-spruce-soft rounded-lg p-3 sm:col-span-1 [&[open]]:col-span-2 [&[open]]:sm:col-span-4">
                <summary className="cursor-pointer list-none">
                  <p className="text-ink-muted text-xs">
                    Missed/rejected
                  </p>

                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-spruce-deep text-xl font-semibold">
                      {report.missed}
                    </p>

                    <span className="text-spruce text-xs font-semibold">
                      {report.missed > 0
                        ? "View details"
                        : "No issues"}
                    </span>
                  </div>
                </summary>

                <div className="border-line mt-3 border-t pt-3">
                  {report.missedRejected.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {report.missedRejected.map((instance) => (
                        <li
                          key={instance.id}
                          className="border-line bg-card rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {choreTitle(instance)}
                              </p>

                              <p className="text-ink-muted mt-1 text-xs">
                                Due{" "}
                                {formatDate(
                                  instance.due_date,
                                )}
                              </p>
                            </div>

                            <span className="border-line bg-card text-ink-muted shrink-0 rounded-full border px-2 py-1 text-xs font-semibold capitalize">
                              {statusLabel(instance.status)}
                            </span>
                          </div>

                          {instance.parent_note && (
                            <p className="text-ink-muted mt-2 text-sm">
                              Parent note:{" "}
                              {instance.parent_note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-muted text-sm">
                      No missed or rejected chores in this
                      reporting period.
                    </p>
                  )}
                </div>
              </details>
            </div>

            <div className="text-ink-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>{report.pending} pending</span>
              <span>
                {report.excused} excused/waived
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold">
                Recent activity
              </h3>

              {report.recent.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {report.recent.map((instance) => (
                    <li
                      key={instance.id}
                      className="border-line flex items-center justify-between gap-3 border-t pt-2 text-sm"
                    >
                      <span>
                        {formatDate(instance.due_date)} ·{" "}
                        {choreTitle(instance)}
                      </span>

                      <span className="text-ink-muted shrink-0 font-medium capitalize">
                        {statusLabel(instance.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-muted mt-2 text-sm">
                  No chore activity in this reporting period.
                </p>
              )}
            </div>
          </article>
        ))}

        {reports.length === 0 && (
          <p className="text-ink-muted">
            No active child profiles were found for this household.
          </p>
        )}
      </section>
    </div>
  );
}
