import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  ANNOUNCEMENTS_KEY,
  MAX_ANNOUNCEMENTS,
  MAX_WINDOW_HOURS,
  MIN_WINDOW_HOURS,
  announcementIsBlank,
  announcementState,
  isValidWindowHours,
  levelMeta,
  normalizeAnnouncement,
  readAnnouncements,
  scheduleProblem,
} from "@/lib/announcements";

export const dynamic = "force-dynamic";

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

function whenLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "an unknown time";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", hour12: true });
}

export async function GET() {
  const gate = await authorize("announcements.view");
  if (gate.response) return gate.response;
  const announcements = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  return NextResponse.json({ announcements, now: Date.now() }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const gate = await authorize("announcements.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid announcement." }, { status: 400 });
  }

  const publishAt = body.publishAt ? new Date(body.publishAt) : new Date();
  if (Number.isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: "That publish time is not a real date." }, { status: 400 });
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const problem = scheduleProblem({
    publishAt: publishAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : "",
  });
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  if (!expiresAt && !isValidWindowHours(body.windowHours)) {
    return NextResponse.json(
      {
        error: `Set how long it runs: whole hours from ${MIN_WINDOW_HOURS} to ${MAX_WINDOW_HOURS}, or pick an end time.`,
      },
      { status: 400 }
    );
  }

  const announcement = normalizeAnnouncement({
    title: body.title,
    body: body.body,
    level: body.level,
    category: body.category,
    pinned: body.pinned,
    image: body.image,
    windowHours: expiresAt ? null : Number(body.windowHours),
    publishAt: publishAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    author: await actor(),
  });

  if (announcementIsBlank(announcement.title, announcement.body)) {
    return NextResponse.json(
      { error: "An announcement needs a title and something to say." },
      { status: 400 }
    );
  }

  const existing = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  await kvSet(ANNOUNCEMENTS_KEY, [announcement, ...existing].slice(0, MAX_ANNOUNCEMENTS));
  refreshPublic("announcements");

  const meta = levelMeta(announcement.level);
  const scheduled = announcementState(announcement) === "scheduled";
  await logActivity({
    area: "admin",
    action: "announcement",
    username: await actor(),
    detail: scheduled
      ? `Scheduled the ${meta.label.toLowerCase()} announcement "${announcement.title}" to go live ${whenLabel(announcement.publishAt)}`
      : `Posted the ${meta.label.toLowerCase()} announcement "${announcement.title}"`,
    request,
  });

  return NextResponse.json({ ok: true, announcement }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Rescheduling keeps the notice, its body and its history intact. An empty
// expiresAt clears the end time, and the stored run length takes over.
export async function PATCH(request) {
  const gate = await authorize("announcements.create");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!body || !id) {
    return NextResponse.json({ error: "Which announcement?" }, { status: 400 });
  }

  const existing = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  const target = existing.find((announcement) => announcement.id === id);
  if (!target) {
    return NextResponse.json({ error: "That announcement is gone already." }, { status: 404 });
  }

  const publishAt = body.publishAt ? new Date(body.publishAt) : new Date(target.publishAt);
  if (Number.isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: "That publish time is not a real date." }, { status: 400 });
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const problem = scheduleProblem({
    publishAt: publishAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : "",
  });
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const updated = normalizeAnnouncement({
    ...target,
    publishAt: publishAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });

  await kvSet(
    ANNOUNCEMENTS_KEY,
    existing.map((announcement) => (announcement.id === id ? updated : announcement))
  );
  refreshPublic("announcements");

  await logActivity({
    area: "admin",
    action: "announcement-schedule",
    username: await actor(),
    detail: `Rescheduled "${updated.title}" to go live ${whenLabel(updated.publishAt)}${
      updated.expiresAt ? ` and end ${whenLabel(updated.expiresAt)}` : ""
    }`,
    request,
  });

  return NextResponse.json({ ok: true, announcement: updated }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request) {
  const gate = await authorize("announcements.delete");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which announcement?" }, { status: 400 });
  }

  const existing = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  const target = existing.find((announcement) => announcement.id === id);
  if (!target) {
    return NextResponse.json({ error: "That announcement is gone already." }, { status: 404 });
  }

  await kvSet(
    ANNOUNCEMENTS_KEY,
    existing.filter((announcement) => announcement.id !== id)
  );
  refreshPublic("announcements");

  await logActivity({
    area: "admin",
    action: "announcement-deleted",
    username: await actor(),
    detail: `Deleted the announcement "${target.title}"`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
