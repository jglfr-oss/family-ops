export type ReminderSettings = {
  reminders_paused: boolean;
  reminder_pause_start: string | null;
  reminder_pause_end: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

/** True if `now` ("HH:MM") falls inside quiet hours; handles windows crossing midnight. */
export function isQuietTime(now: string, start: string, end: string): boolean {
  if (start === end) return false; // zero-length window = quiet hours off
  if (start < end) return now >= start && now < end; // same-day window (e.g. 13:00–15:00)
  return now >= start || now < end; // overnight window (e.g. 21:00–07:00)
}

/** True if reminders are paused today ("YYYY-MM-DD") for this household. */
export function isPaused(s: ReminderSettings | null, today: string): boolean {
  if (!s?.reminders_paused) return false;
  if (!s.reminder_pause_start && !s.reminder_pause_end) return true;
  const afterStart = !s.reminder_pause_start || today >= s.reminder_pause_start;
  const beforeEnd = !s.reminder_pause_end || today <= s.reminder_pause_end;
  return afterStart && beforeEnd;
}
