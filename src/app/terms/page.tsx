import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <article className="prose mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Terms and Conditions — Choreo Chore Reminders
      </h1>
      <p className="text-ink-muted mt-4">
        Choreo Chore Reminders is a private, non-commercial text-message program that sends
        household chore reminders and daily summaries to members of a single household.
      </p>
      <h2 className="mt-6 font-semibold">Program description</h2>
      <p className="mt-2">
        Enrolled household members receive chore reminders (morning, afternoon, and evening) and
        parents receive daily summary messages. Message frequency: up to 4 messages per day per
        recipient. Enrollment is performed by the household administrator with each member&apos;s
        consent.
      </p>
      <h2 className="mt-6 font-semibold">Fees</h2>
      <p className="mt-2">
        The program itself is free. <strong>Message and data rates may apply</strong> according to
        your mobile carrier plan.
      </p>
      <h2 className="mt-6 font-semibold">Opt-out and help</h2>
      <p className="mt-2">
        <strong>Reply STOP to any message to opt out at any time.</strong>{" "}
        <strong>Reply HELP for help</strong>, or contact the household administrator, who can also
        remove your number on request.
      </p>
      <h2 className="mt-6 font-semibold">Support</h2>
      <p className="mt-2">
        For support, contact the household administrator who enrolled you, or reply HELP to any
        program message.
      </p>
    </article>
  );
}
