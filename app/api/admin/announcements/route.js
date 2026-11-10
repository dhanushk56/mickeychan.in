import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import {
  ANNOUNCEMENTS_KEY,
  MAX_ANNOUNCEMENTS,
  MAX_WINDOW_HOURS,
  MIN_WINDOW_HOURS,
  announcementIsBlank,
  isValidWindowHours,
  levelMeta,
  normalizeAnnouncement,
  readAnnouncements,
} from "@/lib/announcements";

export const dynamic = "force-dynamic";

function actor() {
  return getSessionFromCookies()?.user?.username || "Admin";
}

function isAuthorizedRequest() {
  return Boolean(getSessionFromCookies());
}

export async function GET() {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const announcements = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  return NextResponse.json({ announcements, now: Date.now() }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid announcement." }, { status: 400 });
  }

  const announcement = normalizeAnnouncement({
    title: body.title,
    body: body.body,
    level: body.level,
    windowHours: body.windowHours,
    author: actor(),
  });

  if (announcementIsBlank(announcement.title, announcement.body)) {
    return NextResponse.json(
      { error: "An announcement needs a title and something to say." },
      { status: 400 }
    );
  }

  if (!isValidWindowHours(body.windowHours)) {
    return NextResponse.json(
      {
        error: `Set how long it runs: whole hours from ${MIN_WINDOW_HOURS} to ${MAX_WINDOW_HOURS}.`,
      },
      { status: 400 }
    );
  }

  const existing = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  await kvSet(ANNOUNCEMENTS_KEY, [announcement, ...existing].slice(0, MAX_ANNOUNCEMENTS));

  const meta = levelMeta(announcement.level);
  await logActivity({
    area: "admin",
    action: "announcement",
    username: actor(),
    detail: `Posted the ${meta.label.toLowerCase()} announcement “${announcement.title}” for ${announcement.windowHours} hour${announcement.windowHours === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json({ ok: true, announcement }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request) {
  if (!isAuthorizedRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await logActivity({
    area: "admin",
    action: "announcement-deleted",
    username: actor(),
    detail: `Deleted the announcement “${target.title}”`,
    request,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
