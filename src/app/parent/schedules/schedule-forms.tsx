"use client";

import { useActionState, useState } from "react";
import { createSchedule, createException, type ActionState } from "@/lib/actions";

type Option = { id: string; title?: string; display_name?: string };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input = "rounded-lg border border-line px-3 py-2.5 text-base";

export function ScheduleForm({ chores, kids }: { chores: Option[]; kids: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSchedule, {});
  const [cadence, setCadence] = useState("daily");
  return (
    <form action={action} className="rounded-card border-line bg-card border p-5">
      <h2 className="font-semibold">Add a schedule</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Chore
          <select name="chore_id" required className={input}>
            {chores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Child
          <select name="assigned_user_id" required className={input}>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Repeats
          <select
            name="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className={input}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="one_time">One time</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due time (optional)
          <input name="due_time" type="time" className={input} />
        </label>
        {cadence === "weekly" && (
          <fieldset className="text-sm font-medium sm:col-span-2">
            <legend>Days of the week</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" name="days_of_week" value={i} className="size-4" /> {d}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {cadence === "monthly" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Day of month
            <input name="day_of_month" type="number" min={1} max={31} className={input} />
          </label>
        )}
        {cadence === "one_time" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Date
            <input name="one_time_date" type="date" className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start date
          <input
            name="start_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End date (optional)
          <input name="end_date" type="date" className={input} />
        </label>
        <div className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="reminder_eligible" defaultChecked className="size-4" />{" "}
            Send reminders
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="late_completion_allowed" className="size-4" /> Allow late
            completion
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="make_up_allowed" className="size-4" /> Allow make-up (24h)
          </label>
        </div>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-spruce mt-3 text-sm">Schedule added.</p>}
      <button
        disabled={pending}
        className="bg-spruce mt-4 rounded-lg px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save schedule"}
      </button>
    </form>
  );
}

export function ExceptionForm({ schedules }: { schedules: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createException, {});
  if (schedules.length === 0) return null;
  return (
    <form action={action} className="rounded-card border-line bg-card border p-5">
      <h2 className="font-semibold">Add a one-day exception</h2>
      <p className="text-ink-muted mt-1 text-sm">
        Skip, excuse, or waive a single date without changing the base schedule — for travel,
        illness, or special events.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Schedule
          <select name="chore_schedule_id" required className={input}>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date
          <input name="exception_date" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Type
          <select name="exception_type" className={input}>
            <option value="skip">Skip (no chore that day)</option>
            <option value="excused">Excused</option>
            <option value="waive">Waived</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Note (optional)
          <input name="parent_note" className={input} />
        </label>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-spruce mt-3 text-sm">Exception added.</p>}
      <button
        disabled={pending}
        className="border-line mt-4 rounded-lg border px-4 py-2.5 font-semibold disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add exception"}
      </button>
    </form>
  );
}
