import Link from "next/link";

export default async function KidLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const tabs = [
    { href: `/kids/${childId}/today`, label: "Today" },
    { href: `/kids/${childId}/week`, label: "This week" },
    { href: `/kids/${childId}/history`, label: "History" },
    { href: `/kids/${childId}/leaderboard`, label: "Leaderboard" },
  ];
  return (
    <div>
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
