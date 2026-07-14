import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { AllowanceForm } from "./allowance-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const parent = await requireParent();
  const supabase = await createClient();
  const [{ data: household }, { data: settings }, { data: kids }] = await Promise.all([
    supabase.from("households").select("name, timezone").eq("id", parent.household_id!).single(),
    supabase
      .from("household_settings")
      .select(
        "quiet_hours_start, quiet_hours_end, leaderboard_enabled, reminders_paused, reminder_pause_start, reminder_pause_end, reminder_pause_reason"
      )
      .eq("household_id", parent.household_id!)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, display_name, weekly_allowance")
      .eq("household_id", parent.household_id!)
      .eq("role", "child")
      .eq("active", true)
      .order("display_name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Household settings</h1>
      <AllowanceForm
        kids={(kids ?? []).map((k) => ({
          id: k.id,
          display_name: k.display_name,
          weekly_allowance: Number(k.weekly_allowance ?? 0),
        }))}
      />
      <SettingsForm
        initial={{
          name: household?.name ?? "Our Household",
          timezone: household?.timezone ?? "America/New_York",
          quiet_hours_start: String(settings?.quiet_hours_start ?? "21:00").slice(0, 5),
          quiet_hours_end: String(settings?.quiet_hours_end ?? "07:00").slice(0, 5),
          leaderboard_enabled: settings?.leaderboard_enabled ?? true,
          reminders_paused: settings?.reminders_paused ?? false,
          reminder_pause_start: settings?.reminder_pause_start ?? "",
          reminder_pause_end: settings?.reminder_pause_end ?? "",
          reminder_pause_reason: settings?.reminder_pause_reason ?? "",
        }}
      />
    </div>
  );
}
