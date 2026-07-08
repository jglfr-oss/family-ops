import type { ChoreSchedule, ScheduleException } from "@/lib/types";

export type InstanceDraft = {
  chore_id: string;
  chore_schedule_id: string;
  assigned_user_id: string;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:MM[:SS] local household time
  status: "pending" | "excused" | "waived";
  excused_reason: string | null;
  waived_reason: string | null;
};

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

/** Day of week for a YYYY-MM-DD date, 0=Sunday..6=Saturday (UTC-safe). */
export function dayOfWeek(dateOnly: string): number {
  return parseDateOnly(dateOnly).getUTCDay();
}

export function eachDate(startInclusive: string, endInclusive: string): string[] {
  const out: string[] = [];
  const end = parseDateOnly(endInclusive).getTime();
  for (
    let d = parseDateOnly(startInclusive);
    d.getTime() <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    out.push(toDateOnly(d));
  }
  return out;
}

/** Does this schedule produce an instance on this date? (before exceptions) */
export function scheduleOccursOn(schedule: ChoreSchedule, dateOnly: string): boolean {
  if (!schedule.active) return false;
  if (dateOnly < schedule.start_date) return false;
  if (schedule.end_date && dateOnly > schedule.end_date) return false;
  switch (schedule.cadence) {
    case "daily":
      return true;
    case "weekly":
      return (schedule.days_of_week ?? []).includes(dayOfWeek(dateOnly));
    case "monthly": {
      const day = Number(dateOnly.slice(8, 10));
      return day === schedule.day_of_month;
    }
    case "one_time":
      return dateOnly === schedule.one_time_date;
  }
}

/**
 * Pure generation engine: schedules + exceptions + date range -> instance drafts.
 * Deterministic and side-effect free so it is directly unit-testable; the cron
 * route persists drafts with ON CONFLICT DO NOTHING for idempotency.
 */
export function generateInstanceDrafts(
  schedules: ChoreSchedule[],
  exceptions: ScheduleException[],
  fromDate: string,
  toDate: string
): InstanceDraft[] {
  const exByKey = new Map<string, ScheduleException>();
  for (const ex of exceptions) exByKey.set(`${ex.chore_schedule_id}:${ex.exception_date}`, ex);

  const drafts: InstanceDraft[] = [];
  for (const schedule of schedules) {
    for (const date of eachDate(fromDate, toDate)) {
      if (!scheduleOccursOn(schedule, date)) continue;
      const ex = exByKey.get(`${schedule.id}:${date}`);
      if (ex?.exception_type === "skip") continue;

      drafts.push({
        chore_id: schedule.chore_id,
        chore_schedule_id: schedule.id,
        assigned_user_id:
          ex?.exception_type === "reassignment" && ex.replacement_assignee_id
            ? ex.replacement_assignee_id
            : schedule.assigned_user_id,
        due_date: date,
        due_time:
          ex?.exception_type === "due_time_change" && ex.replacement_due_time
            ? ex.replacement_due_time
            : schedule.due_time,
        status:
          ex?.exception_type === "waive"
            ? "waived"
            : ex?.exception_type === "excused"
              ? "excused"
              : "pending",
        excused_reason:
          ex?.exception_type === "excused" ? (ex.parent_note ?? "Excused by parent") : null,
        waived_reason:
          ex?.exception_type === "waive" ? (ex.parent_note ?? "Waived by parent") : null,
      });
    }
  }
  return drafts;
}

/** Combine a household-local date + time into a UTC ISO timestamp. */
export function localDateTimeToUtcIso(dateOnly: string, time: string, timeZone: string): string {
  const [h, m] = time.split(":").map(Number);
  // Find the UTC instant whose wall-clock time in `timeZone` matches.
  const guess = new Date(
    `${dateOnly}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`
  );
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(guess).map((p) => [p.type, p.value]));
  const asLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute)
  );
  const offset = asLocal - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}

/** Today's date (YYYY-MM-DD) in a given IANA timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}
