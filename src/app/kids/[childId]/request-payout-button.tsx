"use client";

import { useState, useTransition } from "react";
import { requestPayout } from "@/lib/actions";

export function RequestPayoutButton({
  weekStart,
  status,
}: {
  weekStart: string;
  status?: "requested" | "paid" | "declined" | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(status ?? null);

  if (localStatus === "paid") return <p className="text-spruce mt-3 text-sm font-medium">Paid ✓</p>;
  if (localStatus === "requested")
    return <p className="text-ink-muted mt-3 text-sm">Payout requested — waiting on a parent.</p>;

  return (
    <div className="mt-3">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestPayout(weekStart);
            if (result.error) setMessage(result.error);
            else {
              setLocalStatus("requested");
              setMessage(null);
            }
          })
        }
        className="bg-spruce rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Requesting…" : "Request payout"}
      </button>
      {localStatus === "declined" && (
        <span className="text-ink-muted ml-2 text-xs">Previous request was declined.</span>
      )}
      {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
    </div>
  );
}
