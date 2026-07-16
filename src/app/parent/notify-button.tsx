"use client";

import { useState, useTransition } from "react";
import { textKidsNow } from "@/lib/actions-notify";

export function NotifyButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await textKidsNow();
            if (result.error) setMessage(result.error);
            else {
              const pushed = result.pushed ?? 0;
              setMessage(
                pushed > 0
                  ? `Sent ${pushed} notification${pushed === 1 ? "" : "s"}.`
                  : "Nothing pending, or no one has notifications on yet."
              );
            }
          })
        }
        className="border-line rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Sending…" : "Notify kids now"}
      </button>
      {message && <p className="text-ink-muted text-xs">{message}</p>}
    </div>
  );
}
