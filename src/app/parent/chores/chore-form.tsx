"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createChore, updateChore, type ActionState } from "@/lib/actions";

export type ChoreInitial = {
  id: string;
  title: string;
  description: string;
  default_points: number;
  requires_approval: boolean;
};

const input = "border-line rounded-lg border px-3 py-2.5 text-base";

export function ChoreForm({ initial }: { initial?: ChoreInitial | null }) {
  const isEdit = !!initial;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateChore : createChore,
    {}
  );
  return (
    <form action={action} className="rounded-card border-line bg-card border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{isEdit ? "Edit chore" : "Add a chore"}</h2>
        {isEdit && (
          <Link href="/parent/chores" className="text-spruce text-sm font-medium underline">
            Cancel
          </Link>
        )}
      </div>
      {isEdit && (
        <>
          <input type="hidden" name="chore_id" value={initial!.id} />
          <p className="text-ink-muted mt-1 text-sm">
            Title and description update everywhere right away. Point changes apply to chores
            generated from tomorrow onward; today&apos;s chores keep their current points.
          </p>
        </>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={initial?.title}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Points
          <input
            name="default_points"
            type="number"
            defaultValue={initial?.default_points ?? 10}
            min={0}
            max={1000}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Description (optional)
          <input
            name="description"
            maxLength={500}
            defaultValue={initial?.description}
            className={input}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            name="requires_approval"
            type="checkbox"
            defaultChecked={initial?.requires_approval ?? false}
            className="size-4"
          />
          Needs parent approval
        </label>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && !isEdit && <p className="text-spruce mt-3 text-sm">Chore added.</p>}
      <button
        disabled={pending}
        className="bg-spruce mt-4 rounded-lg px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Update chore" : "Save chore"}
      </button>
    </form>
  );
}
