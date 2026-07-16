import "server-only";
import { env } from "@/lib/env";

/**
 * Reminder/report senders behind feature flags.
 * With a flag off, senders log intent (status "skipped_flag_disabled") and
 * nothing external is called, so the app works without any credentials.
 */
export type SendResult = { status: string; providerMessageId: string | null; error: string | null };

export async function sendSms(_to: string, _body: string): Promise<SendResult> {
  // SMS is intentionally disabled. Choreo uses push notifications and email
  // instead of text messages, so this never contacts a carrier. Kept as a
  // no-op so existing callers and their logging continue to work unchanged.
  return { status: "skipped_sms_disabled", providerMessageId: null, error: null };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!env.emailEnabled)
    return { status: "skipped_flag_disabled", providerMessageId: null, error: null };
  if (!to || !to.includes("@"))
    return { status: "skipped_no_recipient", providerMessageId: null, error: null };

  const apiKey = process.env.RESEND_API_KEY ?? "";
  const from = process.env.EMAIL_FROM ?? "";
  if (!apiKey || !from)
    return { status: "failed", providerMessageId: null, error: "Resend env vars missing" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Choreo <${from}>`, to: [to], subject, html }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok)
      return {
        status: "failed",
        providerMessageId: null,
        error: data.message ?? `HTTP ${res.status}`,
      };
    return { status: "sent", providerMessageId: data.id ?? null, error: null };
  } catch (e) {
    return {
      status: "failed",
      providerMessageId: null,
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}
