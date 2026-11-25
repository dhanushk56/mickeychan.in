import { NextResponse } from "next/server";
import { refreshPublic } from "@/lib/revalidate";
import { kvSet } from "@/lib/kv";
import { authorize } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity-log";
import { getHomeConfig, readHomeConfig, HOME_KEY, TICKER_KINDS } from "@/lib/home";
import { getVideos } from "@/lib/content";
import { listMembers, publicMember } from "@/lib/members";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const gate = await authorize("content.view");
  if (gate.response) return gate.response;

  const [config, videos, members] = await Promise.all([getHomeConfig(), getVideos(), listMembers()]);

  return NextResponse.json(
    {
      ok: true,
      config,
      tickerKinds: TICKER_KINDS,
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        channel: video.channel,
        type: video.type,
      })),
      members: members
        .filter((member) => member && member.username)
        .map((member) => {
          const profile = publicMember(member);
          return {
            username: profile.username,
            name: profile.name || profile.username,
            profileVisible: member.profileVisible === true,
          };
        })
        .sort((a, b) => a.username.localeCompare(b.username)),
    },
    { headers: NO_STORE }
  );
}

export async function POST(request) {
  const gate = await authorize("content.edit");
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid home page settings." }, { status: 400, headers: NO_STORE });
  }

  const next = readHomeConfig(body);

  // A pick must name a video that exists in the feed, otherwise a typo lands as
  // a silently empty section on the live page.
  if (next.featuredVideoId || next.videoOfWeek.videoId) {
    const videos = await getVideos();
    const ids = new Set(videos.map((video) => String(video.id)));
    if (next.featuredVideoId && !ids.has(next.featuredVideoId)) {
      return NextResponse.json({ error: "That featured video is not in the feed." }, { status: 400, headers: NO_STORE });
    }
    if (next.videoOfWeek.videoId && !ids.has(next.videoOfWeek.videoId)) {
      return NextResponse.json({ error: "That video of the week is not in the feed." }, { status: 400, headers: NO_STORE });
    }
  }

  if (next.videoOfWeek.videoId && next.videoOfWeek.start && next.videoOfWeek.end
    && next.videoOfWeek.end < next.videoOfWeek.start) {
    return NextResponse.json(
      { error: "The end date is before the start date." },
      { status: 400, headers: NO_STORE }
    );
  }

  await kvSet(HOME_KEY, next);
  refreshPublic("home");

  await logActivity({
    area: "admin",
    action: "home",
    username: gate.access.username,
    detail: `Updated the home page: featured ${next.featuredVideoId ? "video set" : "video cleared"}, `
      + `${next.videoOfWeek.videoId ? "video of the week set" : "no video of the week"}, `
      + `${next.milestones.length} milestone${next.milestones.length === 1 ? "" : "s"}, `
      + `${next.featuredMembers.length} featured member${next.featuredMembers.length === 1 ? "" : "s"}`,
    request,
  });

  return NextResponse.json({ ok: true, config: next }, { headers: NO_STORE });
}
