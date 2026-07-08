import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile, homeFor } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getSessionProfile();
  if (profile && profile.household_id) redirect(homeFor(profile));

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card bg-spruce-deep px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sun text-xs font-semibold tracking-widest uppercase">Household status</p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Every chore, on schedule, without the nagging.
        </h1>
        <p className="mt-4 max-w-prose text-white/80">
          Kids get a clear list of today&apos;s chores with one-tap completion. Parents get full
          control of schedules, approvals, points, and reports.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="bg-sun text-spruce-deep inline-block rounded-lg px-5 py-3 text-center font-semibold transition-opacity hover:opacity-90"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "For kids",
            body: "A simple daily list with one-tap completion, points, and streaks.",
          },
          {
            title: "For parents",
            body: "Full chore and schedule management, approvals, and audit history.",
          },
          {
            title: "Automatic",
            body: "Instances, reminders, and reports are generated on a schedule.",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-card border-line bg-card border p-5">
            <h2 className="font-semibold">{card.title}</h2>
            <p className="text-ink-muted mt-2 text-sm">{card.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
