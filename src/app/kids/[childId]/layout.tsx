import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

export default async function KidLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const viewer = await getSessionProfile();
  const parentPreview = viewer?.role === "parent";
  const tabs = [
    { href: `/kids/${childId}/today`, label: "Today" },
    { href: `/kids/${childId}/week`, label: "This week" },
    { href: `/kids/${childId}/upcoming`, label: "Upcoming" },
    { href: `/kids/${childId}/history`, label: "History" },
    { href: `/kids/${childId}/leaderboard`, label: "Leaderboard" },
  ];
  return (
    <div>
      {parentPreview && (
        <p className="bg-spruce-soft text-spruce-deep mb-4 rounded-lg px-3 py-2 text-xs font-medium">
          Parent preview — you are viewing this child&apos;s pages as {viewer?.display_name}.
        </p>
      )}
      <nav aria-label="Kid" className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="text-ink-muted hover:bg-spruce-soft hover:text-spruce-deep rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
