import { getVideos } from "@/lib/content";
import VideosLibrary from "./VideosLibrary";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const { videos, complete } = await getVideos();

  return (
    <section className="px-6 md:px-16 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <p className="section-kicker">From the channel</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Videos & Shorts</h1>
          <p className="text-black/55 dark:text-white/55 mt-3">Browse uploads and shorts, sorted the way you like.</p>
        </div>
        <VideosLibrary videos={videos} complete={complete} />
      </div>
    </section>
  );
}
