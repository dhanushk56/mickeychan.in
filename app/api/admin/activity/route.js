import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { AREA_LABEL, readActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

// Protected, read-only. There is deliberately no DELETE or PATCH here: the log
// is the record of what happened, so the console can only read it.
export async function GET(request) {
  if (!getSessionFromCookies()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entries = await readActivity(searchParams.get("limit") || undefined);

  return NextResponse.json(
    { entries, areas: AREA_LABEL, readOnly: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
