"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createSchedule, updateSchedule, createException, type ActionState } from "@/lib/actions";

type Option = { id: string; title?: string; display_name?: string };

export type ScheduleInitial = {
  id: string;
  chore_id: string;
  assigned_user_id: string;
  cadence: string;
  due_time: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  day_of_month: number | null;
  one_time_date: string;
  late_completion_allowed: boolean;
  make_up_allowed: boolean;
  reminder_eligible: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input = "rounded-lg border border-line px-3 py-2.5 text-base";

export function ScheduleForm({
  chores,
  kids,
  initial,
}: {
  chores: Option[];
  kids: Option[];
  initial?: ScheduleInitial | null;
}) {
  const isEdit = !!initial;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateSchedule : createSchedule,
    {}
  );
  const [cadence, setCadence] = useState(initial?.cadence ?? "daily");
  return (
    <form action={action} className="rounded-card border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{isEdit ? "Edit schedule" : "Add a schedule"}</h2>
        {isEdit && (
          <Link href="/parent/schedules" className="text-sm font-medium text-spruce underline">
            Cancel
          </Link>
        )}
      </div>
      {isEdit && (
        <>
          <input type="hidden" name="schedule_id" value={initial!.id} />
          <p className="mt-1 text-sm text-ink-muted">
            Changes apply from the next generated day onward. Chores already on today&apos;s lists
            keep their original settings.
          </p>
        </>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Chore
          <select name="chore_id" required defaultValue={initial?.chore_id} className={input}>
            {chores.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Child
          <select name="assigned_user_id" required defaultValue={initial?.assigned_user_id} className={input}>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>{k.display_name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Repeats
          <select name="cadence" value={cadence} onChange={(e) => setCadence(e.target.value)} className={input}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="one_time">One time</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due time (optional)
          <input name="due_time" type="time" defaultValue={initial?.due_time} className={input} />
        </label>
        {cadence === "weekly" && (
          <fieldset className="text-sm font-medium sm:col-span-2">
            <legend>Days of the week</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="days_of_week"
                    value={i}
                    defaultChecked={initial?.days_of_week.includes(i)}
                    className="size-4"
                  />{" "}
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {cadence === "monthly" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Day of month
            <input
              name="day_of_month"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.day_of_month ?? undefined}
              className={input}
            />
          </label>
        )}
        {cadence === "one_time" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Date
            <input name="one_time_date" type="date" defaultValue={initial?.one_time_date} className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start date
          <input
            name="start_date"
            type="date"
            required
            defaultValue={initial?.start_date ?? new Date().toISOString().slice(0, 10)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End date (optional)
          <input name="end_date" type="date" defaultValue={initial?.end_date} className={input} />
        </label>
        <div className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="reminder_eligible"
              defaultChecked={initial ? initial.reminder_eligible : true}
              className="size-4"
            />{" "}
            Send reminders
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="late_completion_allowed"
              defaultChecked={initial?.late_completion_allowed ?? false}
              className="size-4"
            />{" "}
            Allow late completion
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="make_up_allowed"
              defaultChecked={initial?.make_up_allowed ?? false}
              className="size-4"
            />{" "}
            Allow make-up (24h)
          </label>
        </div>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && !isEdit && <p className="mt-3 text-sm text-spruce">Schedule added.</p>}
      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-spruce px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Update schedule" : "Save schedule"}
      </button>
    </form>
  );
}

export function ExceptionForm({ schedules }: { schedules: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createException, {});
  if (schedules.length === 0) return null;
  return (
    <form action={action} className="rounded-card border border-line bg-card p-5">
      <h2 className="font-semibold">Add a one-day exception</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Skip, excuse, or waive a single date without changing the base schedule — for travel,
        illness, or special events.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Schedule
          <select name="chore_schedule_id" required className={input}>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
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
      {state.ok && <p className="mt-3 text-sm text-spruce">Exception added.</p>}
      <button
        disabled={pending}
        className="mt-4 rounded-lg border border-line px-4 py-2.5 font-semibold disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add exception"}
      </button>
    </form>
  );
}
