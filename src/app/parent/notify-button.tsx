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
            else if ((result.sent ?? 0) === 0)
              setMessage("Nothing pending (or no phones) — no texts sent.");
            else setMessage(`Sent to ${result.sent} kid${result.sent === 1 ? "" : "s"}.`);
          })
        }
        className="border-line rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Sending…" : "Text kids now"}
      </button>
      {message && <p className="text-ink-muted text-xs">{message}</p>}
    </div>
  );
}
