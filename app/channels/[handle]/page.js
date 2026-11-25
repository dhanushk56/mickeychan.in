import Link from "next/link";
import { notFound } from "next/navigation";
import { getChannel } from "@/lib/content";
import VideoExplorer from "@/components/videos/VideoExplorer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const data = await getChannel(handle);
  if (!data) return { title: "Channel not found" };
  return {
    title: `${data.channel.name} videos`,
    description: `Every ${data.channel.name} upload on mickeychan.in: ${data.videos.length} videos and shorts.`,
    alternates: { canonical: `/channels/${data.channel.handle}` },
  };
}

export default async function ChannelPage({ params }) {
  const { handle } = await params;
  const data = await getChannel(handle);
  if (!data) notFound();

  const { channel, overview, videos } = data;
  const long = videos.filter((video) => video.type !== "short").length;
  const shorts = videos.length - long;

  return (
    <main className="page">
      <div className="shell">
        <Link href="/videos" className="faint text-xs hover:underline">
          ← All videos
        </Link>

        <div className="section-head mt-4">
          <div className="max-w-2xl">
            <p className="kicker">{channel.label}</p>
            <h1 className="display-lg mt-2">{overview?.title || channel.name}</h1>
            {overview?.description && (
              <p className="muted mt-3 whitespace-pre-wrap break-words">
                {overview.description.split("\n").slice(0, 3).join("\n")}
              </p>
            )}
            {!overview?.description && (
              <p className="muted mt-3">
                Everything uploaded to this channel: long-form videos and shorts, searchable and playable here.
              </p>
            )}
          </div>
          <a href={channel.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            Open on YouTube ↗
          </a>
        </div>

        <div className="stat-grid mb-6">
          {overview?.subscribers && (
            <div className="stat">
              <p className="stat-value">{overview.subscribers}</p>
              <p className="stat-label">Subscribers</p>
            </div>
          )}
          {overview?.viewsDisplay && (
            <div className="stat">
              <p className="stat-value">{overview.viewsDisplay}</p>
              <p className="stat-label">Total views</p>
            </div>
          )}
          {overview?.videoCount && (
            <div className="stat">
              <p className="stat-value">{overview.videoCount}</p>
              <p className="stat-label">Videos on YouTube</p>
            </div>
          )}
          <div className="stat">
            <p className="stat-value">{long}</p>
            <p className="stat-label">Long-form here</p>
          </div>
          <div className="stat">
            <p className="stat-value">{shorts}</p>
            <p className="stat-label">Shorts here</p>
          </div>
        </div>

        {overview?.source === "scrape" && (
          <p className="faint text-xs mb-4">
            Follower totals come from the public channel page. Exact figures need the YouTube API
            key configured on the site.
          </p>
        )}

        <VideoExplorer
          videos={videos}
          channelUrl={channel.url}
          channels={[{ id: channel.id, name: channel.name, label: channel.label, url: channel.url }]}
        />
      </div>
    </main>
  );
}
