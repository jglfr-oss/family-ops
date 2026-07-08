import { describe, expect, it } from "vitest";
import { currentStreak, pointsForCompletion, reliabilityScore } from "@/lib/services/scoring";

describe("pointsForCompletion", () => {
  it("awards full points on time", () => {
    expect(
      pointsForCompletion({
        points_available: 10,
        due_at: "2026-07-06T12:00:00Z",
        completed_at: "2026-07-06T11:00:00Z",
      })
    ).toBe(10);
  });
  it("awards reduced points when late", () => {
    expect(
      pointsForCompletion({
        points_available: 10,
        due_at: "2026-07-06T12:00:00Z",
        completed_at: "2026-07-06T13:00:00Z",
      })
    ).toBe(7);
  });
  it("never awards more than the chore's own points when late", () => {
    expect(
      pointsForCompletion({
        points_available: 5,
        due_at: "2026-07-06T12:00:00Z",
        completed_at: "2026-07-06T13:00:00Z",
      })
    ).toBe(5);
  });
  it("awards full points when there is no due time", () => {
    expect(
      pointsForCompletion({
        points_available: 15,
        due_at: null,
        completed_at: "2026-07-06T13:00:00Z",
      })
    ).toBe(15);
  });
});

describe("currentStreak", () => {
  it("counts consecutive fully-done days", () => {
    expect(
      currentStreak([
        { due_date: "2026-07-06", status: "approved" },
        { due_date: "2026-07-05", status: "approved" },
        { due_date: "2026-07-04", status: "missed" },
      ])
    ).toBe(2);
  });
  it("excused/waived days do not break a streak", () => {
    expect(
      currentStreak([
        { due_date: "2026-07-06", status: "approved" },
        { due_date: "2026-07-05", status: "excused" },
        { due_date: "2026-07-04", status: "approved" },
      ])
    ).toBe(2);
  });
  it("a partially-done most-recent day yields zero", () => {
    expect(
      currentStreak([
        { due_date: "2026-07-06", status: "missed" },
        { due_date: "2026-07-06", status: "approved" },
      ])
    ).toBe(0);
  });
});

describe("reliabilityScore", () => {
  it("is 100 for perfect on-time completion", () => {
    const perfect = Array.from({ length: 7 }, (_, i) => ({
      due_date: `2026-07-0${i + 1}`,
      status: "approved" as const,
      due_at: `2026-07-0${i + 1}T12:00:00Z`,
      completed_at: `2026-07-0${i + 1}T11:00:00Z`,
    }));
    expect(reliabilityScore(perfect)).toBe(100);
  });
  it("excludes excused chores from the denominator", () => {
    const a = reliabilityScore([
      {
        due_date: "2026-07-06",
        status: "approved",
        due_at: null,
        completed_at: "2026-07-06T11:00:00Z",
      },
      { due_date: "2026-07-05", status: "excused", due_at: null, completed_at: null },
    ]);
    const b = reliabilityScore([
      {
        due_date: "2026-07-06",
        status: "approved",
        due_at: null,
        completed_at: "2026-07-06T11:00:00Z",
      },
    ]);
    expect(a).toBe(b);
  });
  it("is 0 with no history", () => {
    expect(reliabilityScore([])).toBe(0);
  });
});
