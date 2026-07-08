"use client";

import { useActionState } from "react";
import { createChore, type ActionState } from "@/lib/actions";

export function ChoreForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createChore, {});
  return (
    <form action={action} className="rounded-card border-line bg-card border p-5">
      <h2 className="font-semibold">Add a chore</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            name="title"
            required
            maxLength={120}
            className="border-line rounded-lg border px-3 py-2.5 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Points
          <input
            name="default_points"
            type="number"
            defaultValue={10}
            min={0}
            max={1000}
            className="border-line rounded-lg border px-3 py-2.5 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Description (optional)
          <input
            name="description"
            maxLength={500}
            className="border-line rounded-lg border px-3 py-2.5 text-base"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="requires_approval" type="checkbox" className="size-4" />
          Needs parent approval
        </label>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-spruce mt-3 text-sm">Chore added.</p>}
      <button
        disabled={pending}
        className="bg-spruce mt-4 rounded-lg px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save chore"}
      </button>
    </form>
  );
}
