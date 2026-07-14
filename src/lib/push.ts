import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const contact = process.env.VAPID_SUBJECT ?? "mailto:parent@example.com";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(contact, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushResult = { sent: number; failed: number; pruned: number };

/**
 * Send a push notification to every device a user has registered.
 * Subscriptions that the browser reports as gone (404/410) are pruned.
 * Push is best-effort: failures never block the caller.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/"
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, pruned: 0 };
  if (!configure()) return result;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return result;

  const payload = JSON.stringify({ title, body, url, tag: "choreo-chores" });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        result.sent += 1;
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          result.pruned += 1;
        } else {
          result.failed += 1;
        }
      }
    })
  );

  return result;
}

/**
 * Push a notification to every parent in a household (all their devices).
 * Used for approval alerts and the morning family overview.
 */
export async function sendPushToParents(
  householdId: string,
  title: string,
  body: string,
  url = "/parent"
): Promise<PushResult> {
  const admin = createAdminClient();
  const { data: parents } = await admin
    .from("profiles")
    .select("id")
    .eq("household_id", householdId)
    .eq("role", "parent")
    .eq("active", true);

  const totals: PushResult = { sent: 0, failed: 0, pruned: 0 };
  for (const parent of parents ?? []) {
    const r = await sendPushToUser(parent.id, title, body, url);
    totals.sent += r.sent;
    totals.failed += r.failed;
    totals.pruned += r.pruned;
  }
  return totals;
}
