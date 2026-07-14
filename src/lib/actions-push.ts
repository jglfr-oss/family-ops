"use server";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PushActionState = { error?: string; ok?: boolean };

/** Store (or refresh) a browser push subscription for the signed-in user. */
export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string
): Promise<PushActionState> {
  const profile = await getSessionProfile();
  if (!profile || !profile.household_id) return { error: "Not signed in." };
  if (!endpoint || !p256dh || !auth) return { error: "Incomplete subscription." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      household_id: profile.household_id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  if (error) return { error: "Could not save notification settings." };
  return { ok: true };
}

/** Remove a subscription (device opted out). */
export async function removePushSubscription(endpoint: string): Promise<PushActionState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Not signed in." };
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
