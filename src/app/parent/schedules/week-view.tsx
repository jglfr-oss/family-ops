import { toggleScheduleDay } from "@/lib/actions";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type WeekSchedule = {
  id: string;
  cadence: string;
  due_time: string | null;
  days_of_week: number[] | null;
  day_of_month: number | null;
  one_time_date: string | null;
  active: boolean;
  choreTitle: string;
  kidName: string;
};

function occursOn(s: WeekSchedule, day: number): boolean {
  if (s.cadence === "daily") return true;
  if (s.cadence === "weekly") return (s.days_of_week ?? []).includes(day);
  return false;
}

export function WeekView({
  schedules,
  todayDow,
  error,
}: {
  schedules: WeekSchedule[];
  todayDow: number;
  error?: string;
}) {
  const kids = [...new Set(schedules.map((s) => s.kidName))].sort();
  return (
    <div className="flex flex-col gap-6">
      {error === "lastday" && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          A weekly schedule needs at least one day. Add another day before removing that one.
        </p>
      )}
      <p className="text-ink-muted text-sm">
        Tap a day cell to add or remove that day for weekly chores. Daily chores run every day;
        monthly and one-time chores show their date on the right.
      </p>
      {kids.map((kid) => (
        <section key={kid}>
          <h2 className="mb-2 font-semibold">{kid}</h2>
          <div className="rounded-card border-line bg-card overflow-x-auto border">
            <table className="w-full min-w-130 border-collapse text-sm">
              <thead>
                <tr className="border-line border-b">
                  <th className="px-3 py-2 text-left font-medium">Chore</th>
                  {DAY.map((d, i) => (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center font-medium ${i === todayDow ? "text-spruce-deep" : "text-ink-muted"}`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules
                  .filter((s) => s.kidName === kid)
                  .map((s) => (
                    <tr key={s.id} className="border-line border-b last:border-0">
                      <td className="px-3 py-2">
                        {s.choreTitle}
                        {!s.active && <span className="text-ink-muted text-xs"> (paused)</span>}
                        {s.due_time && (
                          <span className="text-ink-muted text-xs">
                            {" "}
                            · {String(s.due_time).slice(0, 5)}
                          </span>
                        )}
                        {s.cadence === "monthly" && (
                          <span className="text-ink-muted text-xs">
                            {" "}
                            · monthly, day {s.day_of_month}
                          </span>
                        )}
                        {s.cadence === "one_time" && (
                          <span className="text-ink-muted text-xs"> · once, {s.one_time_date}</span>
                        )}
                      </td>
                      {DAY.map((_, day) => (
                        <td
                          key={day}
                          className={`px-1 py-1 text-center ${day === todayDow ? "bg-spruce-soft/40" : ""}`}
                        >
                          {s.cadence === "weekly" ? (
                            <form
                              action={toggleScheduleDay.bind(null, s.id, day)}
                              className="inline"
                            >
                              <button
                                aria-label={`Toggle ${DAY[day]} for ${s.choreTitle}`}
                                className={`size-8 rounded-lg text-base ${
                                  occursOn(s, day)
                                    ? "bg-spruce font-bold text-white"
                                    : "border-line text-ink-muted hover:bg-spruce-soft border"
                                }`}
                              >
                                {occursOn(s, day) ? "✓" : "·"}
                              </button>
                            </form>
                          ) : (
                            <span
                              aria-hidden
                              className={occursOn(s, day) ? "text-spruce" : "text-line"}
                            >
                              {occursOn(s, day) ? "●" : "—"}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {kids.length === 0 && <p className="text-ink-muted">No schedules yet.</p>}
    </div>
  );
}
