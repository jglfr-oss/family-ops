"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Daily operations — the tabs used every day.
const dailyTabs = [
  { href: "/parent", label: "Overview" },
  { href: "/parent/approvals", label: "Approvals" },
  { href: "/parent/reports", label: "Reports" },
  { href: "/parent/payday", label: "Payday" },
];

// Occasional configuration, grouped under a Maintenance dropdown.
const maintenanceItems = [
  { href: "/parent/chores", label: "Chore Maintenance" },
  { href: "/parent/schedules", label: "Schedule Maintenance" },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/parent") return pathname === "/parent";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParentNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const maintenanceActive = maintenanceItems.some((m) => isActiveRoute(pathname, m.href));

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dailyActive =
    "bg-spruce rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm";
  const dailyIdle =
    "text-ink hover:bg-spruce-soft hover:text-spruce-deep rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap";
  // Config items read as muted: lighter gray, lighter weight.
  const configIdle =
    "text-ink-muted/70 hover:bg-spruce-soft hover:text-spruce-deep rounded-lg px-3 py-1.5 text-sm font-normal whitespace-nowrap";
  const configActive =
    "bg-spruce-soft text-spruce-deep rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap";

  return (
    <nav
      aria-label="Parent"
      className="-mx-4 mb-6 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {dailyTabs.map((tab) => {
        const active = isActiveRoute(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={active ? dailyActive : dailyIdle}
          >
            {tab.label}
          </Link>
        );
      })}

      {/* Maintenance dropdown (muted) */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`${maintenanceActive ? configActive : configIdle} flex items-center gap-1`}
        >
          Maintenance
          <span aria-hidden className="text-[0.6rem]">
            ▾
          </span>
        </button>
        {open && (
          <div
            role="menu"
            className="rounded-card border-line bg-card absolute left-0 z-10 mt-1 min-w-52 border p-1 shadow-lg"
          >
            {maintenanceItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "text-spruce-deep block rounded-md px-3 py-2 text-sm font-medium"
                      : "text-ink-muted hover:bg-spruce-soft hover:text-spruce-deep block rounded-md px-3 py-2 text-sm"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings (muted) */}
      <Link
        href="/parent/settings"
        aria-current={isActiveRoute(pathname, "/parent/settings") ? "page" : undefined}
        className={isActiveRoute(pathname, "/parent/settings") ? configActive : configIdle}
      >
        Settings
      </Link>
    </nav>
  );
}
