import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { IDEA_STATUSES, IDEAS_KEY, ideaStatusMeta, readIdeas } from "@/lib/ideas";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

export async function GET() {
  const gate = await authorize("ideas.view");
  if (gate.response) return gate.response;
  return NextResponse.json({ ok: true, ideas: readIdeas(await kvGet(IDEAS_KEY, [])) }, { headers: NO_STORE });
}

export async function PATCH(request) {
  const gate = await authorize("ideas.moderate");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || "");
  const status = String(body?.status || "");

  if (!IDEA_STATUSES.some((entry) => entry.id === status)) {
    return NextResponse.json({ error: "Pick one of the idea states." }, { status: 400, headers: NO_STORE });
  }

  const existing = readIdeas(await kvGet(IDEAS_KEY, []));
  const target = existing.find((idea) => idea.id === id);
  if (!target) {
    return NextResponse.json({ error: "That idea is gone." }, { status: 404, headers: NO_STORE });
  }

  const next = existing.map((idea) => (idea.id === id ? { ...idea, status } : idea));
  await kvSet(IDEAS_KEY, next);
  refreshPublic("ideas");

  await logActivity({
    area: "admin",
    action: "idea-status",
    username: await actor(),
    detail: `Marked the idea "${target.title}" as ${ideaStatusMeta(status).label.toLowerCase()}`,
    request,
  });

  return NextResponse.json({ ok: true, ideas: next }, { headers: NO_STORE });
}

export async function DELETE(request) {
  const gate = await authorize("ideas.delete");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which idea?" }, { status: 400, headers: NO_STORE });
  }

  const existing = readIdeas(await kvGet(IDEAS_KEY, []));
  const target = existing.find((idea) => idea.id === id);
  if (!target) {
    return NextResponse.json({ error: "That idea is gone." }, { status: 404, headers: NO_STORE });
  }

  await kvSet(IDEAS_KEY, existing.filter((idea) => idea.id !== id));
  refreshPublic("ideas");

  await logActivity({
    area: "admin",
    action: "idea-deleted",
    username: await actor(),
    detail: `Deleted the idea "${target.title}"`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
