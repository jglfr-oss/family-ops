import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentStreak, reliabilityScore } from "@/lib/services/scoring";
import type { InstanceStatus } from "@/lib/types";

type Report = { subject: string; html: string };

const DONE = new Set(["completed", "approved"]);
const SKIP = new Set(["excused", "waived"]);

const styles = {
  body: "font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#212a25;max-width:560px;margin:0 auto;padding:16px",
  h1: "font-size:20px;margin:0 0 4px",
  sub: "color:#5c6a62;font-size:13px;margin:0 0 16px",
  card: "border:1px solid #dde3de;border-radius:12px;padding:14px 16px;margin:0 0 12px",
  name: "font-weight:600;margin:0 0 6px",
  row: "font-size:14px;margin:2px 0;color:#212a25",
  muted: "color:#5c6a62",
  badge:
    "display:inline-block;background:#e3ede8;color:#123d2e;border-radius:8px;padding:1px 8px;font-size:12px;font-weight:600",
};

function shell(title: string, period: string, inner: string): string {
  return `<div style="${styles.body}"><h1 style="${styles.h1}">${title}</h1><p style="${styles.sub}">${period}</p>${inner}<p style="${styles.sub}">Family Ops · automated household report</p></div>`;
}

function dateNDaysAgo(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

type Kid = { id: string; display_name: string };
type Inst = {
  assigned_user_id: string;
  status: InstanceStatus;
  due_date: string;
  due_at: string | null;
  completed_at: string | null;
  chores: { title: string } | { title: string }[] | null;
};

function titleOf(i: Inst): string {
  const c = i.chores;
  if (!c) return "a chore";
  return Array.isArray(c) ? (c[0]?.title ?? "a chore") : c.title;
}

async function load(householdId: string, fromDate: string, toDate: string) {
  const admin = createAdminClient();
  const [{ data: kids }, { data: instances }, { count: awaiting }, { data: reminderFails }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, display_name")
        .eq("household_id", householdId)
        .eq("role", "child")
        .eq("active", true),
      admin
        .from("chore_instances")
        .select("assigned_user_id, status, due_date, due_at, completed_at, chores(title)")
        .eq("household_id", householdId)
        .gte("due_date", fromDate)
        .lte("due_date", toDate),
      admin
        .from("chore_instances")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("status", "completed"),
      admin
        .from("reminder_log")
        .select("id")
        .eq("household_id", householdId)
        .eq("delivery_status", "failed")
        .gte("sent_at", `${fromDate}T00:00:00Z`),
    ]);
  return {
    kids: (kids ?? []) as Kid[],
    instances: (instances ?? []) as unknown as Inst[],
    awaiting: awaiting ?? 0,
    reminderFails: (reminderFails ?? []).length,
  };
}

function perKidCounts(kid: Kid, instances: Inst[]) {
  const mine = instances.filter((i) => i.assigned_user_id === kid.id);
  const countable = mine.filter((i) => !SKIP.has(i.status));
  const done = countable.filter((i) => DONE.has(i.status));
  const onTime = done.filter((i) => !i.due_at || (i.completed_at && i.completed_at <= i.due_at));
  return {
    mine,
    total: countable.length,
    done: done.length,
    onTime: done.length ? Math.round((onTime.length / done.length) * 100) : 100,
    missed: mine.filter((i) => i.status === "missed"),
    excused: mine.filter((i) => SKIP.has(i.status)).length,
    streak: currentStreak(mine),
    reliability: reliabilityScore(mine),
  };
}

export async function buildDailyReport(
  householdId: string,
  householdName: string,
  today: string
): Promise<Report> {
  const { kids, instances, awaiting, reminderFails } = await load(householdId, today, today);
  const cards = kids
    .map((k) => {
      const c = perKidCounts(k, instances);
      const missedList = c.missed.length
        ? `<p style="${styles.row}"><span style="${styles.muted}">Missed:</span> ${c.missed.map(titleOf).join(", ")}</p>`
        : "";
      return `<div style="${styles.card}"><p style="${styles.name}">${k.display_name} <span style="${styles.badge}">${c.done}/${c.total}</span></p>${missedList}${c.excused ? `<p style="${styles.row}"><span style="${styles.muted}">Excused/waived:</span> ${c.excused}</p>` : ""}</div>`;
    })
    .join("");
  const footer = `<div style="${styles.card}"><p style="${styles.row}">Awaiting your approval: <strong>${awaiting}</strong></p><p style="${styles.row}">Reminder delivery failures today: <strong>${reminderFails}</strong></p></div>`;
  return {
    subject: `Family Ops daily — ${today}`,
    html: shell(`${householdName}: today`, today, cards + footer),
  };
}

export async function buildWeeklyReport(
  householdId: string,
  householdName: string,
  today: string
): Promise<Report> {
  const from = dateNDaysAgo(today, 6);
  const { kids, instances } = await load(householdId, from, today);
  const stats = kids.map((k) => ({ kid: k, c: perKidCounts(k, instances) }));
  const leader = [...stats].sort((a, b) => b.c.done - a.c.done)[0];
  const cards = stats
    .map(({ kid, c }) => {
      const pct = c.total ? Math.round((c.done / c.total) * 100) : 100;
      return `<div style="${styles.card}"><p style="${styles.name}">${kid.display_name} ${leader && leader.kid.id === kid.id && c.done > 0 ? '<span style="' + styles.badge + '">Weekly Leader</span>' : ""}</p><p style="${styles.row}">Completion: <strong>${pct}%</strong> (${c.done}/${c.total}) · On-time: <strong>${c.onTime}%</strong></p><p style="${styles.row}">Reliability score: <strong>${c.reliability}/100</strong> · Streak: <strong>${c.streak} days</strong></p></div>`;
    })
    .join("");
  const missTally = new Map<string, number>();
  for (const i of instances)
    if (i.status === "missed") missTally.set(titleOf(i), (missTally.get(titleOf(i)) ?? 0) + 1);
  const problem = [...missTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const problems = problem.length
    ? `<div style="${styles.card}"><p style="${styles.name}">Frequently missed</p>${problem.map(([t, n]) => `<p style="${styles.row}">${t} <span style="${styles.muted}">· missed ${n}×</span></p>`).join("")}</div>`
    : "";
  return {
    subject: `Family Ops weekly — week of ${from}`,
    html: shell(`${householdName}: weekly review`, `${from} to ${today}`, cards + problems),
  };
}

export async function buildMonthlyReport(
  householdId: string,
  householdName: string,
  today: string
): Promise<Report> {
  const from = dateNDaysAgo(today, 29);
  const { kids, instances } = await load(householdId, from, today);
  const cards = kids
    .map((k) => {
      const c = perKidCounts(k, instances);
      return `<div style="${styles.card}"><p style="${styles.name}">${k.display_name}</p><p style="${styles.row}">Assigned: <strong>${c.total}</strong> · Completed: <strong>${c.done}</strong> · Missed: <strong>${c.missed.length}</strong> · Excused/waived: <strong>${c.excused}</strong></p><p style="${styles.row}">Reliability: <strong>${c.reliability}/100</strong> · Current streak: <strong>${c.streak} days</strong></p></div>`;
    })
    .join("");
  return {
    subject: `Family Ops monthly — ${from} to ${today}`,
    html: shell(`${householdName}: monthly report`, `${from} to ${today}`, cards),
  };
}
