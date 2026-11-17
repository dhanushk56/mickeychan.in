import { NextResponse } from "next/server";
import { authorize } from "@/lib/admin-guard";
import { AREA_LABEL, readActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const gate = await authorize("audit.view");
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const entries = await readActivity(searchParams.get("limit") || undefined);

  return NextResponse.json(
    { entries, areas: AREA_LABEL, readOnly: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
