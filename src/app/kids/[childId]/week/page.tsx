import type { Metadata } from "next";
import { requireChildSelf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone, eachDate } from "@/lib/services/instances";

export const metadata: Metadata = { title: "This week" };
const DONE = new Set(["completed", "approved"]);

export default async function KidWeek({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  await requireChildSelf(childId);
  const supabase = await createClient();
  const today = todayInTimeZone("America/New_York");
  const start = eachDate(today, today)[0];
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const { data: instances } = await supabase
    .from("chore_instances")
    .select("id, due_date, status, chores(title)")
    .eq("assigned_user_id", childId)
    .gte("due_date", start)
    .lte("due_date", endStr)
    .order("due_date");

  const byDay = new Map<string, NonNullable<typeof instances>>();
  for (const d of eachDate(start, endStr)) byDay.set(d, []);
  for (const i of instances ?? []) byDay.get(i.due_date)?.push(i);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="rounded-card border-line bg-card border p-4">
          <h2 className="text-ink-muted text-sm font-semibold">
            {new Date(`${day}T12:00:00Z`).toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h2>
          <ul className="mt-2 space-y-1">
            {list.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span>{(i.chores as unknown as { title: string } | null)?.title}</span>
                <span aria-hidden>
                  {DONE.has(i.status) ? "✅" : i.status === "pending" ? "⬜" : "•"}
                </span>
              </li>
            ))}
            {list.length === 0 && <li className="text-ink-muted text-sm">Nothing scheduled</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}
