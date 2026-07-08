import "server-only";
import { env } from "@/lib/env";

/**
 * Reminder/report service abstractions behind feature flags.
 * The app is fully functional with both flags off: senders log intent to the
 * delivery tables with status "skipped_flag_disabled" instead of sending.
 * Wiring Twilio/Resend later only means implementing the two send functions.
 */
export type SendResult = { status: string; providerMessageId: string | null; error: string | null };

export async function sendSms(_to: string, _body: string): Promise<SendResult> {
  if (!env.smsEnabled)
    return { status: "skipped_flag_disabled", providerMessageId: null, error: null };
  // Twilio integration point (ENABLE_SMS_REMINDERS=true + Twilio env vars).
  // Keep SMS content minimal; include opt-out wording per carrier compliance.
  return {
    status: "not_implemented",
    providerMessageId: null,
    error: "Twilio sender not yet implemented",
  };
}

export async function sendEmail(_to: string, _subject: string, _html: string): Promise<SendResult> {
  if (!env.emailEnabled)
    return { status: "skipped_flag_disabled", providerMessageId: null, error: null };
  // Resend integration point (ENABLE_EMAIL_REPORTS=true + RESEND_API_KEY).
  return {
    status: "not_implemented",
    providerMessageId: null,
    error: "Resend sender not yet implemented",
  };
}
