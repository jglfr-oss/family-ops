import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 * Server-only (enforced by the "server-only" import). Used exclusively by
 * cron jobs and system services — never for user-initiated reads.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
