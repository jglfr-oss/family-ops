import Link from "next/link";
import { getSessionProfile, homeFor } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getSessionProfile();
  return (
    <header className="border-line bg-card/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={profile ? homeFor(profile) : "/"} className="flex items-center gap-2">
          <span
            aria-hidden
            className="bg-spruce grid size-7 place-items-center rounded-lg text-sm font-bold text-white"
          >
            ✓
          </span>
          <span className="text-lg font-semibold tracking-tight">Family Ops</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          {profile ? (
            <>
              <span className="text-ink-muted hidden text-sm sm:inline">
                {profile.display_name}
              </span>
              <form action="/logout" method="post">
                <button className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-spruce rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
