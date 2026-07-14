"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/parent", label: "Overview" },
  { href: "/parent/chores", label: "Chores" },
  { href: "/parent/schedules", label: "Schedules" },
  { href: "/parent/approvals", label: "Approvals" },
  { href: "/parent/reports", label: "Reports" },
  { href: "/parent/payday", label: "Payday" },
  { href: "/parent/settings", label: "Settings" },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/parent") {
    return pathname === "/parent";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParentNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Parent" className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = isActiveRoute(pathname, tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "bg-spruce rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm"
                : "text-ink-muted hover:bg-spruce-soft hover:text-spruce-deep rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
