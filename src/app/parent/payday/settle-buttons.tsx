"use client";

import { useState, useTransition } from "react";
import { settlePayout } from "@/lib/actions";

export function SettleButtons({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"paid" | "declined" | null>(null);

  if (done === "paid")
    return <span className="text-spruce text-sm font-medium">Marked paid ✓</span>;
  if (done === "declined") return <span className="text-ink-muted text-sm">Declined</span>;

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await settlePayout(requestId, "paid");
            if (!r.error) setDone("paid");
          })
        }
        className="bg-spruce rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "Mark paid"}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await settlePayout(requestId, "declined");
            if (!r.error) setDone("declined");
          })
        }
        className="border-line rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        Decline
      </button>
    </div>
  );
}
