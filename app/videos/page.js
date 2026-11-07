import { getVideos } from "@/lib/content";

export const dynamic = "force-dynamic";

function VideoSection({ title, items }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-16">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold">{title}</h2>
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((video) => (
          <a key={video.id} href={video.url} target="_blank" rel="noreferrer" className="glass-card rounded-2xl overflow-hidden video-card">
            <div className="video-placeholder" style={{ backgroundImage: `url(${video.thumbnail})` }} />
            <div className="p-5">
              <h3 className="font-semibold text-base mb-2 leading-snug">{video.title}</h3>
              <p className="text-sm text-black/45 dark:text-white/45">{video.date}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function VideosPage() {
  const videos = await getVideos();
  const shorts = videos.filter((video) => video.type === "short");
  const regularVideos = videos.filter((video) => video.type !== "short");

  return (
    <section className="px-6 md:px-16 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <p className="section-kicker">From the channel</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Videos & Shorts</h1>
          <p className="text-black/55 dark:text-white/55 mt-3">Automatically refreshed from YouTube every few minutes.</p>
        </div>
        {videos.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-black/60 dark:text-white/60">YouTube videos are temporarily unavailable.</div>
        ) : (
          <>
            <VideoSection title="Videos" items={regularVideos} />
            <VideoSection title="Shorts" items={shorts} />
          </>
        )}
      </div>
    </section>
  );
}
