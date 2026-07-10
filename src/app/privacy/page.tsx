import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-ink-muted mt-4">
        Family Ops is a private household chore application used by a single family.
      </p>
      <h2 className="mt-6 font-semibold">Information we collect</h2>
      <p className="mt-2">
        The application stores only the information the household administrator (a parent) enters:
        family member names, email addresses used to sign in, phone numbers for reminders, and chore
        activity such as assignments, completions, and points.
      </p>
      <h2 className="mt-6 font-semibold">How information is used</h2>
      <p className="mt-2">
        Information is used solely to operate the chore system for this household: showing each
        family member their chores, sending chore reminder text messages and summary reports to
        household members, and tracking completion history.
      </p>
      <h2 className="mt-6 font-semibold">Sharing</h2>
      <p className="mt-2">
        Information is never sold, shared with third parties, or used for marketing or advertising
        of any kind. Service providers (our hosting and text-message delivery vendors) process data
        only as required to deliver the features above.
      </p>
      <h2 className="mt-6 font-semibold">Text messages</h2>
      <p className="mt-2">
        Text reminders go only to household members whose numbers a parent added with their consent.
        Any recipient can opt out at any time by replying STOP or by asking the household
        administrator to remove their number.
      </p>
      <h2 className="mt-6 font-semibold">Contact</h2>
      <p className="mt-2">
        Questions about this policy can be directed to the household administrator.
      </p>
    </article>
  );
}
