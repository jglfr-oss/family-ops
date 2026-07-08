"use client";

import { useActionState } from "react";
import { rejectInstance, type ActionState } from "@/lib/actions";

export function RejectForm({ instanceId }: { instanceId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(rejectInstance, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="instance_id" value={instanceId} />
      <input
        name="parent_note"
        required
        placeholder="Reason (required)"
        className="border-line rounded-lg border px-3 py-2 text-sm"
      />
      <button
        disabled={pending}
        className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
      >
        Reject
      </button>
      {state.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
