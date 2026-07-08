export type AppRole = "parent" | "child";
export type Cadence = "daily" | "weekly" | "monthly" | "one_time";
export type InstanceStatus =
  "pending" | "completed" | "approved" | "rejected" | "missed" | "excused" | "waived";
export type ExceptionType = "skip" | "reassignment" | "due_time_change" | "waive" | "excused";

export type Profile = {
  id: string;
  household_id: string | null;
  role: AppRole;
  display_name: string;
  email: string | null;
  active: boolean;
};

export type Chore = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  default_points: number;
  requires_approval: boolean;
  active: boolean;
  archived_at: string | null;
};

export type ChoreSchedule = {
  id: string;
  chore_id: string;
  assigned_user_id: string;
  cadence: Cadence;
  due_time: string | null; // "HH:MM:SS"
  start_date: string; // "YYYY-MM-DD"
  end_date: string | null;
  days_of_week: number[] | null; // 0=Sun..6=Sat
  day_of_month: number | null;
  one_time_date: string | null;
  reminder_eligible: boolean;
  late_completion_allowed: boolean;
  make_up_allowed: boolean;
  make_up_deadline_hours: number | null;
  active: boolean;
};

export type ScheduleException = {
  chore_schedule_id: string;
  exception_date: string;
  exception_type: ExceptionType;
  replacement_due_time: string | null;
  replacement_assignee_id: string | null;
  parent_note: string | null;
};

export type ChoreInstance = {
  id: string;
  household_id: string;
  chore_id: string;
  chore_schedule_id: string | null;
  assigned_user_id: string;
  due_date: string;
  due_at: string | null;
  status: InstanceStatus;
  points_available: number;
  completed_at: string | null;
  approved_at: string | null;
  parent_note: string | null;
  make_up_due_at: string | null;
};
