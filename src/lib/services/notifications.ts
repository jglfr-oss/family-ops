import "server-only";
import { env } from "@/lib/env";

/**
 * Reminder/report senders behind feature flags.
 * With a flag off, senders log intent (status "skipped_flag_disabled") and
 * nothing external is called, so the app works without any credentials.
 */
export type SendResult = { status: string; providerMessageId: string | null; error: string | null };

export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (!env.smsEnabled) return { status: "skipped_flag_disabled", providerMessageId: null, error: null };
  if (!to) return { status: "skipped_no_phone", providerMessageId: null, error: null };

  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID ?? "";
  if (!sid || !token || !messagingServiceSid)
    return { status: "failed", providerMessageId: null, error: "Twilio env vars missing" };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, MessagingServiceSid: messagingServiceSid, Body: body }),
    });
    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) return { status: "failed", providerMessageId: null, error: data.message ?? `HTTP ${res.status}` };
    return { status: "sent", providerMessageId: data.sid ?? null, error: null };
  } catch (e) {
    return { status: "failed", providerMessageId: null, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function sendEmail(_to: string, _subject: string, _html: string): Promise<SendResult> {
  if (!env.emailEnabled) return { status: "skipped_flag_disabled", providerMessageId: null, error: null };
  // Resend integration point (ENABLE_EMAIL_REPORTS=true + RESEND_API_KEY).
  return { status: "not_implemented", providerMessageId: null, error: "Resend sender not yet implemented" };
}
