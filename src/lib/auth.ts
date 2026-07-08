import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, household_id, role, display_name, email, active")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
}

/** Server-side guard: parent role required. Redirects otherwise. */
export async function requireParent(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent" || !profile.active || !profile.household_id) redirect("/");
  return profile;
}

/** Server-side guard: signed-in child viewing their own pages only. */
export async function requireChildSelf(childId: string): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  // Parents may view any child page in their household; children only their own.
  if (profile.role === "child" && profile.id !== childId) redirect(`/kids/${profile.id}/today`);
  return profile;
}

export function homeFor(profile: Profile | null): string {
  if (!profile || !profile.household_id) return "/login";
  return profile.role === "parent" ? "/parent" : `/kids/${profile.id}/today`;
}
