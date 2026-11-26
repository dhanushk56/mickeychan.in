import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { STUDIO_KEY, normalizeStudio, readStudio } from "@/lib/studio";

export const dynamic = "force-dynamic";

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

export async function GET() {
  const gate = await authorize("studio.view");
  if (gate.response) return gate.response;
  const studio = readStudio(await kvGet(STUDIO_KEY, {}));
  return NextResponse.json({ studio }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request) {
  const gate = await authorize("studio.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid studio content." }, { status: 400 });
  }

  const studio = normalizeStudio(body.studio || body);
  await kvSet(STUDIO_KEY, studio);
  refreshPublic("studio");

  await logActivity({
    area: "admin",
    action: "studio",
    username: await actor(),
    detail: `Saved the studio page (${studio.team.length} team, ${studio.upcoming.length} upcoming, ${studio.notes.length} notes)`,
    request,
  });

  return NextResponse.json({ ok: true, studio }, { headers: { "Cache-Control": "no-store" } });
}
