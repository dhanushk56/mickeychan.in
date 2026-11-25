import { NextResponse } from "next/server";
import { refreshPublic, refreshStory } from "@/lib/revalidate";
import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies } from "@/lib/auth";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import {
  MAX_STORIES,
  STORIES_KEY,
  normalizeStory,
  publishProblem,
  readStories,
  uniqueSlug,
} from "@/lib/stories";

export const dynamic = "force-dynamic";

async function actor() {
  return (await getSessionFromCookies())?.user?.username || "Admin";
}

function payload(body) {
  return {
    title: body.title,
    summary: body.summary,
    status: body.status,
    beats: body.beats,
  };
}

export async function GET() {
  const gate = await authorize("content.view");
  if (gate.response) return gate.response;
  const stories = readStories(await kvGet(STORIES_KEY, []));
  return NextResponse.json({ stories }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid story." }, { status: 400 });
  }

  const existing = readStories(await kvGet(STORIES_KEY, []));
  const story = normalizeStory(payload(body));
  if (!story.title) {
    return NextResponse.json({ error: "An arc needs a title." }, { status: 400 });
  }
  story.slug = uniqueSlug(existing, story.slug);

  const problem = story.status === "draft" ? "" : publishProblem(story);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const stories = [story, ...existing].slice(0, MAX_STORIES);
  await kvSet(STORIES_KEY, stories);
  refreshPublic("stories");
  refreshStory(story.slug);

  await logActivity({
    area: "admin",
    action: "story",
    username: await actor(),
    detail: `Opened the story arc "${story.title}"`,
    request,
  });

  return NextResponse.json({ ok: true, stories }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !body.id) {
    return NextResponse.json({ error: "Which story?" }, { status: 400 });
  }

  const existing = readStories(await kvGet(STORIES_KEY, []));
  const current = existing.find((entry) => entry.id === body.id);
  if (!current) {
    return NextResponse.json({ error: "That story is gone already." }, { status: 404 });
  }

  const story = normalizeStory({ ...current, ...payload(body), id: current.id });
  if (!story.title) {
    return NextResponse.json({ error: "An arc needs a title." }, { status: 400 });
  }
  story.slug = uniqueSlug(existing, story.slug || current.slug, current.id);
  story.createdAt = current.createdAt;
  story.updatedAt = new Date().toISOString();

  const problem = story.status === "draft" ? "" : publishProblem(story);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const stories = existing.map((entry) => (entry.id === current.id ? story : entry));
  await kvSet(STORIES_KEY, stories);
  refreshPublic("stories");
  refreshStory(story.slug);
  if (current.slug !== story.slug) refreshStory(current.slug);

  await logActivity({
    area: "admin",
    action: "story-updated",
    username: await actor(),
    detail: `Saved the story arc "${story.title}"`,
    request,
  });

  return NextResponse.json({ ok: true, stories }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which story?" }, { status: 400 });

  const existing = readStories(await kvGet(STORIES_KEY, []));
  const target = existing.find((entry) => entry.id === id);
  if (!target) {
    return NextResponse.json({ error: "That story is gone already." }, { status: 404 });
  }

  const stories = existing.filter((entry) => entry.id !== id);
  await kvSet(STORIES_KEY, stories);
  refreshPublic("stories");
  refreshStory(target.slug);

  await logActivity({
    area: "admin",
    action: "story-deleted",
    username: await actor(),
    detail: `Removed the story arc "${target.title}"`,
    request,
  });

  return NextResponse.json({ ok: true, stories }, { headers: { "Cache-Control": "no-store" } });
}
