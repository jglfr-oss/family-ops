"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border-line rounded-lg border px-3 py-2.5 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border-line rounded-lg border px-3 py-2.5 text-base"
        />
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-spruce rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
