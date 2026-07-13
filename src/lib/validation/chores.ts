import { z } from "zod";

export const choreSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  default_points: z.coerce.number().int().min(0).max(1000),
});

export const scheduleSchema = z
  .object({
    chore_id: z.string().uuid(),
    assigned_user_id: z.string().uuid(),
    cadence: z.enum(["daily", "weekly", "monthly", "one_time"]),
    due_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .or(z.literal("")),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    days_of_week: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    day_of_month: z.coerce.number().int().min(1).max(31).optional(),
    one_time_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    late_completion_allowed: z.coerce.boolean(),
    make_up_allowed: z.coerce.boolean(),
    reminder_eligible: z.coerce.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.cadence === "weekly" && (!v.days_of_week || v.days_of_week.length === 0))
      ctx.addIssue({
        code: "custom",
        message: "Pick at least one day of the week",
        path: ["days_of_week"],
      });
    if (v.cadence === "monthly" && !v.day_of_month)
      ctx.addIssue({ code: "custom", message: "Pick a day of the month", path: ["day_of_month"] });
    if (v.cadence === "one_time" && !v.one_time_date)
      ctx.addIssue({ code: "custom", message: "Pick a date", path: ["one_time_date"] });
  });

export const rejectSchema = z.object({
  instance_id: z.string().uuid(),
  parent_note: z.string().trim().min(1, "A note is required when rejecting"),
});

export const overrideSchema = z.object({
  instance_id: z.string().uuid(),
  new_status: z.enum(["approved", "missed", "excused", "waived", "completed"]),
  reason: z.string().trim().min(1, "A reason is required for overrides"),
});
