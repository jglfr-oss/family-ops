"use client";

import { useState, useTransition } from "react";
import { completeChore } from "@/lib/actions";

export function CompleteButton({ instanceId }: { instanceId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await completeChore(instanceId);
            setError(result?.error ?? null);
          })
        }
        className="bg-spruce rounded-xl px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "Done!"}
      </button>
      {error && <p className="max-w-40 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
