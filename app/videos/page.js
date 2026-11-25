import Link from "next/link";
import { getVideos, channels, channelUrl } from "@/lib/content";
import VideoExplorer from "@/components/videos/VideoExplorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Videos",
  description:
    "Every Mickey Chan upload — long-form videos and shorts, searchable, filterable and playable right here.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage({ searchParams }) {
  const videos = await getVideos();
  const grouped = channels.flatMap((channel) => [
    ...videos.filter((video) => video.channel === channel.id && video.type !== "short"),
    ...videos.filter((video) => video.channel === channel.id && video.type === "short"),
  ]);
  const query = await searchParams;
  const initialId = typeof query?.v === "string" ? query.v : "";
  const savedOnly = videos.some((video) => video.stale);

  return (
    <section className="page">
      <div className="shell">
        <div className="section-head">
          <div className="max-w-2xl">
            <p className="kicker">From the channel</p>
            <h1 className="display-lg mt-2">Videos &amp; Shorts</h1>
            <p className="muted mt-3">
              Pulled from{" "}
              {channels.map((channel, index) => (
                <span key={channel.id}>
                  {index > 0 ? (index === channels.length - 1 ? " and " : ", ") : null}
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {channel.name || channel.label}
                  </a>
                </span>
              ))}
              . Search, filter and sort the whole library, or open any video on its own page.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.handle}`}
                  className="btn btn-secondary btn-sm"
                >
                  {channel.name || channel.label} channel
                </Link>
              ))}
            </div>
          </div>
          <a href={channelUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            Open YouTube ↗
          </a>
        </div>

        {savedOnly && (
          <p className="badge badge-pending mb-4">
            YouTube is unreachable right now — showing the saved list, without live view counts or dates.
          </p>
        )}

        <VideoExplorer
          videos={grouped}
          initialId={initialId}
          channelUrl={channelUrl}
          channels={channels.map(({ id, name, label, url }) => ({ id, name, label, url }))}
        />
      </div>
    </section>
  );
}
