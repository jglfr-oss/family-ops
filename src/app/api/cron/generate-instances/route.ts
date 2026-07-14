import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { generateForAllHouseholds } from "@/lib/services/generate";

function authorized(request: Request): boolean {
  return request.headers.get("authorization") === `Bearer ${env.cronSecret}` && !!env.cronSecret;
}

/** Generates chore instances for today (or ?days=N ahead, max 30). Idempotent. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const days = Math.min(Number(new URL(request.url).searchParams.get("days") ?? "1"), 30);
  const { created, carried } = await generateForAllHouseholds(days);
  return NextResponse.json({ ok: true, created, carried });
}
