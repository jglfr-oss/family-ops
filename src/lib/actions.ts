"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, homeFor, requireParent } from "@/lib/auth";
import { choreSchema, scheduleSchema, rejectSchema, overrideSchema } from "@/lib/validation/chores";
import { pointsForCompletion } from "@/lib/services/scoring";

export type ActionState = { error?: string; ok?: boolean };

// ---------- auth ----------

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Sign-in failed. Check your email and password." };
  const profile = await getSessionProfile();
  redirect(homeFor(profile));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- audit helper ----------

async function audit(
  householdId: string,
  actorId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  previousData: unknown,
  newData: unknown
) {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    household_id: householdId,
    actor_user_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    previous_data: previousData ?? null,
    new_data: newData ?? null,
  });
}

// ---------- parent: chores ----------

export async function createChore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  const parsed = choreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chores")
    .insert({
      household_id: parent.household_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      default_points: parsed.data.default_points,
      requires_approval: formData.get("requires_approval") === "on",
      created_by: parent.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not create the chore." };
  await audit(parent.household_id!, parent.id, "chore", data.id, "create", null, parsed.data);
  revalidatePath("/parent/chores");
  return { ok: true };
}

export async function setChoreActive(choreId: string, active: boolean): Promise<void> {
  const parent = await requireParent();
  const supabase = await createClient();
  await supabase.from("chores").update({ active }).eq("id", choreId);
  await audit(
    parent.household_id!,
    parent.id,
    "chore",
    choreId,
    active ? "reactivate" : "pause",
    { active: !active },
    { active }
  );
  revalidatePath("/parent/chores");
}

export async function archiveChore(choreId: string): Promise<void> {
  const parent = await requireParent();
  const supabase = await createClient();
  await supabase
    .from("chores")
    .update({ active: false, archived_at: new Date().toISOString() })
    .eq("id", choreId);
  await audit(parent.household_id!, parent.id, "chore", choreId, "archive", null, null);
  revalidatePath("/parent/chores");
}

// ---------- parent: schedules ----------

export async function createSchedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  const raw = {
    chore_id: formData.get("chore_id"),
    assigned_user_id: formData.get("assigned_user_id"),
    cadence: formData.get("cadence"),
    due_time: formData.get("due_time") ?? "",
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") ?? "",
    days_of_week: formData.getAll("days_of_week").map(Number),
    day_of_month: formData.get("day_of_month") || undefined,
    one_time_date: formData.get("one_time_date") ?? "",
    late_completion_allowed: formData.get("late_completion_allowed") === "on",
    make_up_allowed: formData.get("make_up_allowed") === "on",
    reminder_eligible: formData.get("reminder_eligible") === "on",
  };
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();

  // Duplicate warning: same chore + child + cadence, still active.
  const { data: dupes } = await supabase
    .from("chore_schedules")
    .select("id")
    .eq("chore_id", v.chore_id)
    .eq("assigned_user_id", v.assigned_user_id)
    .eq("cadence", v.cadence)
    .eq("active", true);
  if (dupes && dupes.length > 0)
    return {
      error: "A matching active schedule already exists for this chore, child, and cadence.",
    };

  const { data, error } = await supabase
    .from("chore_schedules")
    .insert({
      chore_id: v.chore_id,
      assigned_user_id: v.assigned_user_id,
      cadence: v.cadence,
      due_time: v.due_time || null,
      start_date: v.start_date,
      end_date: v.end_date || null,
      days_of_week: v.cadence === "weekly" ? v.days_of_week : null,
      day_of_month: v.cadence === "monthly" ? v.day_of_month : null,
      one_time_date: v.cadence === "one_time" ? v.one_time_date : null,
      late_completion_allowed: v.late_completion_allowed,
      make_up_allowed: v.make_up_allowed,
      make_up_deadline_hours: v.make_up_allowed ? 24 : null,
      reminder_eligible: v.reminder_eligible,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not create the schedule." };
  await audit(parent.household_id!, parent.id, "chore_schedule", data.id, "create", null, v);
  revalidatePath("/parent/schedules");
  return { ok: true };
}

export async function setScheduleActive(scheduleId: string, active: boolean): Promise<void> {
  const parent = await requireParent();
  const supabase = await createClient();
  await supabase.from("chore_schedules").update({ active }).eq("id", scheduleId);
  await audit(
    parent.household_id!,
    parent.id,
    "chore_schedule",
    scheduleId,
    active ? "reactivate" : "pause",
    { active: !active },
    { active }
  );
  revalidatePath("/parent/schedules");
}

export async function createException(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parent = await requireParent();
  const scheduleId = String(formData.get("chore_schedule_id") ?? "");
  const date = String(formData.get("exception_date") ?? "");
  const type = String(formData.get("exception_type") ?? "skip");
  const note = String(formData.get("parent_note") ?? "").trim();
  if (!scheduleId || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { error: "Pick a schedule and a date." };
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_exceptions").insert({
    chore_schedule_id: scheduleId,
    exception_date: date,
    exception_type: type,
    parent_note: note || null,
    created_by: parent.id,
  });
  if (error) return { error: "Could not add the exception (one may already exist for that date)." };
  await audit(parent.household_id!, parent.id, "schedule_exception", null, "create", null, {
    scheduleId,
    date,
    type,
  });
  revalidatePath("/parent/schedules");
  return { ok: true };
}

// ---------- child: completion ----------

export async function completeChore(instanceId: string): Promise<ActionState> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  // RLS guarantees the child can only see their own instance.
  const { data: instance } = await supabase
    .from("chore_instances")
    .select(
      "id, status, due_at, make_up_due_at, chore_schedule_id, household_id, assigned_user_id, points_available, completed_at, chores(requires_approval)"
    )
    .eq("id", instanceId)
    .single();
  if (!instance) return { error: "Chore not found." };
  if (instance.status !== "pending") return { error: "This chore is already done or closed." };
  if (instance.assigned_user_id !== profile.id && profile.role !== "parent")
    return { error: "You can only complete your own chores." };

  // Deadline check. Late-completion rules live on the schedule (parent-only
  // under RLS), so the check runs through the admin client after ownership
  // has already been proven above via the user's own RLS-scoped read.
  const now = new Date();
  if (instance.due_at && now > new Date(instance.due_at)) {
    let lateAllowed = false;
    if (instance.chore_schedule_id) {
      const admin = createAdminClient();
      const { data: sched } = await admin
        .from("chore_schedules")
        .select("late_completion_allowed")
        .eq("id", instance.chore_schedule_id)
        .single();
      lateAllowed = sched?.late_completion_allowed ?? false;
    }
    const inMakeUpWindow = instance.make_up_due_at && now <= new Date(instance.make_up_due_at);
    if (!lateAllowed && !inMakeUpWindow)
      return { error: "The completion window for this chore has closed. Ask a parent." };
  }

  const requiresApproval = Array.isArray(instance.chores)
    ? false
    : ((instance.chores as { requires_approval: boolean } | null)?.requires_approval ?? false);
  const newStatus = requiresApproval ? "completed" : "approved";
  const completedAt = now.toISOString();

  const { error, data: updated } = await supabase
    .from("chore_instances")
    .update({
      status: newStatus,
      completed_at: completedAt,
      approved_at: requiresApproval ? null : completedAt,
    })
    .eq("id", instanceId)
    .eq("status", "pending") // duplicate-submission guard
    .select("id")
    .single();
  if (error || !updated)
    return { error: "Could not complete the chore (it may have just changed)." };

  await supabase.from("chore_instance_events").insert({
    chore_instance_id: instanceId,
    actor_user_id: profile.id,
    event_type: "completed",
    previous_status: "pending",
    new_status: newStatus,
  });

  if (!requiresApproval) {
    await supabase.from("score_events").insert({
      household_id: instance.household_id,
      user_id: instance.assigned_user_id,
      chore_instance_id: instanceId,
      event_type: "chore_approved",
      points: pointsForCompletion({
        points_available: instance.points_available,
        due_at: instance.due_at,
        completed_at: completedAt,
      }),
    });
  }

  revalidatePath(`/kids/${instance.assigned_user_id}/today`);
  return { ok: true };
}

// ---------- parent: approvals & overrides ----------

export async function approveInstance(instanceId: string): Promise<ActionState> {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data: instance } = await supabase
    .from("chore_instances")
    .select("id, status, due_at, completed_at, points_available, household_id, assigned_user_id")
    .eq("id", instanceId)
    .single();
  if (!instance || instance.status !== "completed") return { error: "Nothing to approve." };
  const { error } = await supabase
    .from("chore_instances")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: parent.id })
    .eq("id", instanceId)
    .eq("status", "completed");
  if (error) return { error: "Approval failed." };
  await supabase.from("chore_instance_events").insert({
    chore_instance_id: instanceId,
    actor_user_id: parent.id,
    event_type: "approved",
    previous_status: "completed",
    new_status: "approved",
  });
  await supabase.from("score_events").insert({
    household_id: instance.household_id,
    user_id: instance.assigned_user_id,
    chore_instance_id: instanceId,
    event_type: "chore_approved",
    points: pointsForCompletion(instance),
  });
  revalidatePath("/parent/approvals");
  return { ok: true };
}

export async function rejectInstance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: instance } = await supabase
    .from("chore_instances")
    .select("id, status, due_at")
    .eq("id", parsed.data.instance_id)
    .single();
  if (!instance || instance.status !== "completed") return { error: "Nothing to reject." };
  // Back to pending only if the window is still open; otherwise rejected.
  const windowOpen = !instance.due_at || new Date() <= new Date(instance.due_at);
  const newStatus = windowOpen ? "pending" : "rejected";
  await supabase
    .from("chore_instances")
    .update({
      status: newStatus,
      parent_note: parsed.data.parent_note,
      rejected_at: new Date().toISOString(),
      rejected_by: parent.id,
      completed_at: null,
    })
    .eq("id", parsed.data.instance_id)
    .eq("status", "completed");
  await supabase.from("chore_instance_events").insert({
    chore_instance_id: parsed.data.instance_id,
    actor_user_id: parent.id,
    event_type: "rejected",
    previous_status: "completed",
    new_status: newStatus,
    metadata: { note: parsed.data.parent_note },
  });
  revalidatePath("/parent/approvals");
  return { ok: true };
}

export async function overrideInstance(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parent = await requireParent();
  const parsed = overrideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: instance } = await supabase
    .from("chore_instances")
    .select("id, status, household_id")
    .eq("id", parsed.data.instance_id)
    .single();
  if (!instance) return { error: "Chore instance not found." };
  const patch: Record<string, unknown> = { status: parsed.data.new_status };
  if (parsed.data.new_status === "excused") patch.excused_reason = parsed.data.reason;
  if (parsed.data.new_status === "waived") patch.waived_reason = parsed.data.reason;
  await supabase.from("chore_instances").update(patch).eq("id", parsed.data.instance_id);
  await supabase.from("parent_overrides").insert({
    household_id: instance.household_id,
    chore_instance_id: instance.id,
    parent_user_id: parent.id,
    override_type: `status_${parsed.data.new_status}`,
    reason: parsed.data.reason,
  });
  await supabase.from("chore_instance_events").insert({
    chore_instance_id: instance.id,
    actor_user_id: parent.id,
    event_type: "parent_override",
    previous_status: instance.status,
    new_status: parsed.data.new_status,
    metadata: { reason: parsed.data.reason },
  });
  revalidatePath("/parent");
  return { ok: true };
}
