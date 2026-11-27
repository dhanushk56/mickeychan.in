import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { limitReached, recordHit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";
import { solvePuzzle } from "@/lib/arg";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// Twelve tries every five minutes is generous for a person reading the clue and
// tight enough that the answer cannot be found by guessing in a loop.
const LIMIT = { max: 12, windowMs: 5 * 60 * 1000 };

export async function POST(request) {
  const member = await memberFromCookieStore(await cookies()).catch(() => null);
  if (!member) {
    return NextResponse.json(
      { error: "Log in so the site can keep your progress." },
      { status: 401, headers: NO_STORE }
    );
  }

  const gate = await limitReached("arg-solve", member.username, LIMIT);
  if (gate.limited) {
    return NextResponse.json(
      { error: `Too many tries. Wait about ${Math.ceil(gate.retryAfter / 60)} minutes.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(gate.retryAfter) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: NO_STORE });
  }

  const result = await solvePuzzle({
    username: member.username,
    puzzleId: String(body?.puzzleId || ""),
    answer: body?.answer,
  });

  if (result.error) {
    await recordHit("arg-solve", member.username, LIMIT);
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 400, headers: NO_STORE }
    );
  }

  if (!result.already) {
    await logActivity({
      area: "website",
      action: "arg",
      username: member.username,
      detail: `Opened an ARG lock (${result.points || 0} points)`,
    });
  }

  return NextResponse.json(result, { headers: NO_STORE });
}
