import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { EVENTS_KEY, MAX_EVENTS, listEvents, normalizeEvent, readEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

export async function GET() {
  const gate = await authorize("announcements.view");
  if (gate.response) return gate.response;
  return NextResponse.json({ ok: true, events: await listEvents() }, { headers: NO_STORE });
}

export async function POST(request) {
  const gate = await authorize("announcements.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid event." }, { status: 400, headers: NO_STORE });
  }

  const event = normalizeEvent({
    title: body.title,
    description: body.description,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    url: body.url,
    author: await actor(),
  });

  if (!event.title) {
    return NextResponse.json({ error: "Give the event a title." }, { status: 400, headers: NO_STORE });
  }
  if (!event.startsAt) {
    return NextResponse.json({ error: "Set the start date and time." }, { status: 400, headers: NO_STORE });
  }

  const existing = readEvents(await kvGet(EVENTS_KEY, []));
  await kvSet(EVENTS_KEY, [event, ...existing].slice(0, MAX_EVENTS));

  await logActivity({
    area: "admin",
    action: "event",
    username: await actor(),
    detail: `Added the event “${event.title}”`,
    request,
  });

  return NextResponse.json({ ok: true, event }, { headers: NO_STORE });
}

export async function DELETE(request) {
  const gate = await authorize("announcements.delete");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which event?" }, { status: 400, headers: NO_STORE });
  }

  const existing = readEvents(await kvGet(EVENTS_KEY, []));
  const target = existing.find((event) => event.id === id);
  if (!target) {
    return NextResponse.json({ error: "That event is gone." }, { status: 404, headers: NO_STORE });
  }

  await kvSet(EVENTS_KEY, existing.filter((event) => event.id !== id));

  await logActivity({
    area: "admin",
    action: "event-deleted",
    username: await actor(),
    detail: `Deleted the event “${target.title}”`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
