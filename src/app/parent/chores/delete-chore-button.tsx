"use client";

import { useTransition } from "react";
import { deleteChore } from "@/lib/actions";

export function DeleteChoreButton({ choreId, title }: { choreId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(
            `Delete "${title}"?\n\nThis also removes its schedules and any upcoming chores. Completed history and points are kept.`
          )
        ) {
          startTransition(() => deleteChore(choreId));
        }
      }}
      className="border-line rounded-lg border px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
