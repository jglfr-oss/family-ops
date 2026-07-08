import { describe, expect, it } from "vitest";
import {
  dayOfWeek,
  eachDate,
  generateInstanceDrafts,
  localDateTimeToUtcIso,
  scheduleOccursOn,
} from "@/lib/services/instances";
import type { ChoreSchedule, ScheduleException } from "@/lib/types";

const base: ChoreSchedule = {
  id: "s1",
  chore_id: "c1",
  assigned_user_id: "kid1",
  cadence: "daily",
  due_time: "08:00:00",
  start_date: "2026-07-01",
  end_date: null,
  days_of_week: null,
  day_of_month: null,
  one_time_date: null,
  reminder_eligible: true,
  late_completion_allowed: false,
  make_up_allowed: false,
  make_up_deadline_hours: null,
  active: true,
};

describe("scheduleOccursOn", () => {
  it("daily occurs every day within range", () => {
    expect(scheduleOccursOn(base, "2026-07-06")).toBe(true);
    expect(scheduleOccursOn(base, "2026-06-30")).toBe(false); // before start
    expect(scheduleOccursOn({ ...base, end_date: "2026-07-05" }, "2026-07-06")).toBe(false);
  });
  it("weekly matches configured weekdays", () => {
    const weekly = { ...base, cadence: "weekly" as const, days_of_week: [6] }; // Saturday
    expect(dayOfWeek("2026-07-11")).toBe(6);
    expect(scheduleOccursOn(weekly, "2026-07-11")).toBe(true);
    expect(scheduleOccursOn(weekly, "2026-07-10")).toBe(false);
  });
  it("monthly matches the day of month", () => {
    const monthly = { ...base, cadence: "monthly" as const, day_of_month: 15 };
    expect(scheduleOccursOn(monthly, "2026-07-15")).toBe(true);
    expect(scheduleOccursOn(monthly, "2026-07-16")).toBe(false);
  });
  it("one_time matches only its date", () => {
    const once = { ...base, cadence: "one_time" as const, one_time_date: "2026-07-20" };
    expect(scheduleOccursOn(once, "2026-07-20")).toBe(true);
    expect(scheduleOccursOn(once, "2026-07-21")).toBe(false);
  });
  it("inactive schedules never occur", () => {
    expect(scheduleOccursOn({ ...base, active: false }, "2026-07-06")).toBe(false);
  });
});

describe("generateInstanceDrafts", () => {
  it("generates one draft per day for daily cadence", () => {
    const drafts = generateInstanceDrafts([base], [], "2026-07-06", "2026-07-08");
    expect(drafts).toHaveLength(3);
    expect(drafts.map((d) => d.due_date)).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);
  });
  it("skip exceptions remove the day", () => {
    const ex: ScheduleException = {
      chore_schedule_id: "s1",
      exception_date: "2026-07-07",
      exception_type: "skip",
      replacement_due_time: null,
      replacement_assignee_id: null,
      parent_note: null,
    };
    const drafts = generateInstanceDrafts([base], [ex], "2026-07-06", "2026-07-08");
    expect(drafts.map((d) => d.due_date)).toEqual(["2026-07-06", "2026-07-08"]);
  });
  it("reassignment exceptions swap the child for that date only", () => {
    const ex: ScheduleException = {
      chore_schedule_id: "s1",
      exception_date: "2026-07-07",
      exception_type: "reassignment",
      replacement_due_time: null,
      replacement_assignee_id: "kid2",
      parent_note: null,
    };
    const drafts = generateInstanceDrafts([base], [ex], "2026-07-06", "2026-07-08");
    expect(drafts.map((d) => d.assigned_user_id)).toEqual(["kid1", "kid2", "kid1"]);
  });
  it("waive/excused exceptions create pre-statused instances", () => {
    const ex: ScheduleException = {
      chore_schedule_id: "s1",
      exception_date: "2026-07-07",
      exception_type: "excused",
      replacement_due_time: null,
      replacement_assignee_id: null,
      parent_note: "sick day",
    };
    const drafts = generateInstanceDrafts([base], [ex], "2026-07-07", "2026-07-07");
    expect(drafts[0].status).toBe("excused");
    expect(drafts[0].excused_reason).toBe("sick day");
  });
});

describe("date helpers", () => {
  it("eachDate is inclusive", () => {
    expect(eachDate("2026-07-06", "2026-07-06")).toEqual(["2026-07-06"]);
    expect(eachDate("2026-07-30", "2026-08-01")).toHaveLength(3);
  });
  it("localDateTimeToUtcIso converts household local time to UTC", () => {
    // 08:00 America/New_York in July (EDT, UTC-4) = 12:00 UTC
    expect(localDateTimeToUtcIso("2026-07-06", "08:00", "America/New_York")).toBe(
      "2026-07-06T12:00:00.000Z"
    );
    // 08:00 in January (EST, UTC-5) = 13:00 UTC
    expect(localDateTimeToUtcIso("2026-01-06", "08:00", "America/New_York")).toBe(
      "2026-01-06T13:00:00.000Z"
    );
  });
});
