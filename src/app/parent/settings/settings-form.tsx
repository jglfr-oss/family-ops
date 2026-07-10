"use client";

import { useActionState, useState } from "react";
import { updateSettings, type ActionState } from "@/lib/actions";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const input = "rounded-lg border border-line px-3 py-2.5 text-base";

export type SettingsInitial = {
  name: string;
  timezone: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  leaderboard_enabled: boolean;
  reminders_paused: boolean;
  reminder_pause_start: string;
  reminder_pause_end: string;
  reminder_pause_reason: string;
};

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettings, {});
  const [paused, setPaused] = useState(initial.reminders_paused);

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="rounded-card border-line bg-card border p-5">
        <h2 className="font-semibold">Household</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Household name
            <input name="name" required defaultValue={initial.name} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Timezone
            <select name="timezone" defaultValue={initial.timezone} className={input}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-ink-muted mt-2 text-xs">
          The timezone controls when chores are generated and which day counts as &quot;today.&quot;
        </p>
      </section>

      <section className="rounded-card border-line bg-card border p-5">
        <h2 className="font-semibold">Quiet hours</h2>
        <p className="text-ink-muted mt-1 text-sm">
          No reminder texts are sent between these times, even if chores are pending.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start (evening)
            <input
              name="quiet_hours_start"
              type="time"
              defaultValue={initial.quiet_hours_start}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            End (morning)
            <input
              name="quiet_hours_end"
              type="time"
              defaultValue={initial.quiet_hours_end}
              className={input}
            />
          </label>
        </div>
      </section>

      <section className="rounded-card border-line bg-card border p-5">
        <h2 className="font-semibold">Leaderboard</h2>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="leaderboard_enabled"
            defaultChecked={initial.leaderboard_enabled}
            className="size-4"
          />
          Show the family leaderboard to kids
        </label>
      </section>

      <section className="rounded-card border-line bg-card border p-5">
        <h2 className="font-semibold">Pause reminders</h2>
        <p className="text-ink-muted mt-1 text-sm">
          For vacations, illness, or a breather. Chores still generate and can be completed — only
          the texts stop.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="reminders_paused"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
            className="size-4"
          />
          Reminders are paused
        </label>
        {paused && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Pause from (optional)
              <input
                name="reminder_pause_start"
                type="date"
                defaultValue={initial.reminder_pause_start}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Resume after (optional)
              <input
                name="reminder_pause_end"
                type="date"
                defaultValue={initial.reminder_pause_end}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
              Reason (optional, shows in your records)
              <input
                name="reminder_pause_reason"
                defaultValue={initial.reminder_pause_reason}
                className={input}
              />
            </label>
            <p className="text-ink-muted text-xs sm:col-span-2">
              With dates set, reminders stop only inside that window and resume automatically.
              Without dates, they stay off until you untick the box.
            </p>
          </div>
        )}
      </section>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-spruce text-sm">Settings saved.</p>}
      <button
        disabled={pending}
        className="bg-spruce self-start rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
