"use client";

import { useState, useTransition } from "react";
import { refreshTodayChores } from "@/lib/actions";

export function RefreshTodayButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = (await refreshTodayChores()) as {
              error?: string;
              created?: number;
              carried?: number;
            };
            if (result.error) setMessage(result.error);
            else {
              const added = (result.created ?? 0) + (result.carried ?? 0);
              setMessage(
                added > 0
                  ? `Added ${added} chore${added === 1 ? "" : "s"} to today.`
                  : "Today's list is already up to date."
              );
            }
          })
        }
        className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "Refresh today's chores"}
      </button>
      {message && <p className="text-ink-muted text-xs">{message}</p>}
    </div>
  );
}
