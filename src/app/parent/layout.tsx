import Link from "next/link";
import { requireParent } from "@/lib/auth";

const tabs = [
  { href: "/parent", label: "Overview" },
  { href: "/parent/chores", label: "Chores" },
  { href: "/parent/schedules", label: "Schedules" },
  { href: "/parent/approvals", label: "Approvals" },
  { href: "/parent/settings", label: "Settings" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireParent(); // server-side role guard (layer 2; RLS is layer 1)
  return (
    <div>
      <nav
        aria-label="Parent"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
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
