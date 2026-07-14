"use client";

import { useActionState } from "react";
import { updateAllowances, type ActionState } from "@/lib/actions";
import { TIERS } from "@/lib/services/allowance";

export type KidAllowance = { id: string; display_name: string; weekly_allowance: number };

export function AllowanceForm({ kids }: { kids: KidAllowance[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAllowances, {});
  if (kids.length === 0) return null;

  return (
    <form action={action} className="rounded-card border-line bg-card border p-5">
      <h2 className="font-semibold">Weekly allowance</h2>
      <p className="text-ink-muted mt-1 text-sm">
        Each child&apos;s full weekly allowance (Sunday to Saturday). What they actually earn scales
        with their reliability that week — excused and waived chores never count against them.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {kids.map((kid) => (
          <label key={kid.id} className="flex flex-col gap-1 text-sm font-medium">
            {kid.display_name}
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">$</span>
              <input
                name={`allowance_${kid.id}`}
                type="number"
                min={0}
                max={1000}
                step="0.25"
                defaultValue={Number(kid.weekly_allowance ?? 0)}
                className="border-line w-full rounded-lg border px-3 py-2.5 text-base"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="border-line mt-4 border-t pt-3">
        <p className="text-ink-muted text-xs font-medium">Reliability tiers</p>
        <ul className="mt-1 space-y-0.5">
          {TIERS.map((t) => (
            <li key={t.min} className="text-ink-muted text-xs">
              {t.min}%+ → {Math.round(t.rate * 100)}% of allowance ({t.label})
            </li>
          ))}
        </ul>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-spruce mt-3 text-sm">Allowances saved.</p>}
      <button
        disabled={pending}
        className="bg-spruce mt-4 rounded-lg px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save allowances"}
      </button>
    </form>
  );
}
