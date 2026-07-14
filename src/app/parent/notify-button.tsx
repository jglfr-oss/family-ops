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
              const parts = [];
              if (result.sent) parts.push(`${result.sent} text${result.sent === 1 ? "" : "s"}`);
              if (result.pushed)
                parts.push(`${result.pushed} notification${result.pushed === 1 ? "" : "s"}`);
              setMessage(
                parts.length ? `Sent ${parts.join(" and ")}.` : "Nothing pending — nothing sent."
              );
            }
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
