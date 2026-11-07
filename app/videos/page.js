import { getVideos, channelUrl } from "@/lib/content";
import VideoExplorer from "@/components/videos/VideoExplorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Videos",
  description: "Every Mickey Chan upload — long-form videos and shorts, playable right here.",
};

export default async function VideosPage({ searchParams }) {
  const videos = await getVideos();
  const initialId = typeof searchParams?.v === "string" ? searchParams.v : "";

  return (
    <section className="page">
      <div className="shell">
        <div className="section-head">
          <div className="max-w-2xl">
            <p className="kicker">From the channel</p>
            <h1 className="display-lg mt-2">Videos &amp; Shorts</h1>
            <p className="muted mt-3">
              Pulled live from{" "}
              <a href={channelUrl} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: "var(--primary)" }}>
                @mickeychaan
              </a>
              . Click any thumbnail to watch without leaving the site.
            </p>
          </div>
          <a href={channelUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            Open YouTube ↗
          </a>
        </div>

        <VideoExplorer videos={videos} initialId={initialId} channelUrl={channelUrl} />
      </div>
    </section>
  );
}
