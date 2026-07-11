import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(homeFor(profile));
  return (
    <div className="mx-auto max-w-sm">
      <section className="rounded-card border-line bg-card border p-6 sm:p-8">
        <p className="text-spruce text-xs font-semibold tracking-widest uppercase">Choreo</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-ink-muted mt-2 text-sm">
          Use the email and password a parent set up for you.
        </p>
        <LoginForm />
      </section>
    </div>
  );
}
