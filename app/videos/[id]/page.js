import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { channels, getVideo, getVideos, relatedVideos } from "@/lib/content";
import { isoDurationFromSeconds } from "@/lib/youtube";
import VideoShare from "@/components/videos/VideoShare";
import SaveMenu from "@/components/videos/SaveMenu";
import { memberFromCookieStore } from "@/lib/members";
import { recordHistory } from "@/lib/library";

export const dynamic = "force-dynamic";

function channelOf(video) {
  return channels.find((channel) => channel.id === video?.channel) || null;
}

function subtitle(video) {
  const description = String(video?.description || "").trim();
  if (description) return description.slice(0, 300);
  const channel = channelOf(video);
  return `${video?.title || "Video"} — ${channel?.name || "Mickey Chan"} on YouTube.`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return { title: "Video not found" };

  const description = subtitle(video);
  return {
    title: video.title,
    description,
    alternates: { canonical: `/videos/${video.id}` },
    openGraph: {
      title: video.title,
      description,
      url: `/videos/${video.id}`,
      type: "video.other",
      images: [{ url: video.thumbnail, alt: video.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: [video.thumbnail],
    },
  };
}

export default async function VideoPage({ params }) {
  const { id } = await params;
  const all = await getVideos();
  const video = all.find((entry) => entry.id === id) || (await getVideo(id));
  if (!video) notFound();

  // Opening a video while signed in is what fills the dashboard's history.
  const session = await memberFromCookieStore(cookies());
  if (session) await recordHistory(session.username, video.id);

  const channel = channelOf(video);
  const related = relatedVideos(all, video, 8);
  const meta = [
    video.views && `${video.views} views`,
    video.published || (video.publishedAt ? new Date(video.publishedAt).toDateString() : ""),
    video.duration,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: subtitle(video),
    thumbnailUrl: [video.thumbnail],
    url: `https://mickeychan.in/videos/${video.id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
    ...(video.publishedAt ? { uploadDate: video.publishedAt } : {}),
    ...(video.durationSeconds ? { duration: isoDurationFromSeconds(video.durationSeconds) } : {}),
    publisher: {
      "@type": "Organization",
      name: "Mickey Chan",
      url: "https://mickeychan.in",
    },
  };

  return (
    <main className="page">
      <div className="shell">
        <Link href="/videos" className="faint text-xs hover:underline">
          ← All videos
        </Link>

        <div className="grid gap-6 mt-4 lg:grid-cols-[minmax(0,1fr)_18rem] items-start">
          <div className="min-w-0 grid gap-4">
            <div
              className="glass-card overflow-hidden"
              style={video.type === "short" ? { maxWidth: "26rem" } : undefined}
            >
              <iframe
                className="modal-video"
                data-short={video.type === "short"}
                src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-neutral">{video.type === "short" ? "Short" : "Video"}</span>
                {channel && (
                  <Link href={`/channels/${channel.handle}`} className="badge badge-neutral hover:underline">
                    {channel.name}
                  </Link>
                )}
                {video.stale && <span className="badge badge-pending">Saved listing</span>}
              </div>
              <h1 className="display-lg mt-3 break-words">{video.title}</h1>
              {meta.length > 0 && (
                <p className="faint text-sm mt-2">{meta.join(" · ")}</p>
              )}
            </div>

            <div className="video-actions">
              <VideoShare videoId={video.id} title={video.title} url={video.url} />
              <SaveMenu videoId={video.id} />
            </div>

            {video.description ? (
              <div className="glass-card p-5">
                <h2 className="font-display font-bold">Description</h2>
                <p className="muted text-sm mt-2 whitespace-pre-wrap break-words">{video.description}</p>
              </div>
            ) : (
              <div className="glass-card p-5">
                <h2 className="font-display font-bold">Description</h2>
                <p className="faint text-sm mt-2">
                  {video.source === "api"
                    ? "This video has no description on YouTube."
                    : "The description is only available when YouTube's API is configured — open the video on YouTube to read it."}
                </p>
              </div>
            )}

            {(video.tags || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="faint text-xs">Tags:</span>
                {video.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/videos?tag=${encodeURIComponent(tag)}`}
                    className="chip"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="grid gap-3">
            <div className="glass-card p-5 grid gap-2">
              <h2 className="font-display font-bold">At a glance</h2>
              <dl className="grid gap-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="faint">Channel</dt>
                  <dd>{channel?.name || "Mickey Chan"}</dd>
                </div>
                {video.publishedAt && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="faint">Published</dt>
                    <dd>{new Date(video.publishedAt).toLocaleDateString()}</dd>
                  </div>
                )}
                {video.views && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="faint">Views</dt>
                    <dd>{video.views}</dd>
                  </div>
                )}
                {video.duration && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="faint">Length</dt>
                    <dd>{video.duration}</dd>
                  </div>
                )}
              </dl>
            </div>

            {related.length > 0 && (
              <div className="glass-card p-5 grid gap-3">
                <h2 className="font-display font-bold">Up next</h2>
                {related.slice(0, 4).map((entry) => (
                  <Link key={entry.id} href={`/videos/${entry.id}`} className="flex gap-3 items-start hover:underline">
                    <span
                      className="rounded-lg overflow-hidden shrink-0"
                      style={{
                        width: "5.5rem",
                        aspectRatio: entry.type === "short" ? "9 / 16" : "16 / 9",
                        backgroundImage: `url(${entry.thumbnail})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-semibold block leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {entry.title}
                      </span>
                      <span className="faint text-xs block mt-1">
                        {[entry.views && `${entry.views} views`, entry.published].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <div className="section-head">
              <h2 className="display-lg">More like this</h2>
              <Link href="/videos" className="btn btn-secondary btn-sm">
                Browse everything
              </Link>
            </div>
            <div className="video-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start">
              {related.map((entry) => (
                <Link key={entry.id} href={`/videos/${entry.id}`} className="glass-card video-card lift">
                  <span
                    className="video-thumb"
                    data-short={entry.type === "short"}
                    style={{ backgroundImage: `url(${entry.thumbnail})`, display: "block" }}
                    aria-hidden="true"
                  />
                  <span className="video-body block">
                    <span className="video-title">{entry.title}</span>
                    <span className="faint text-xs mt-1.5 block">
                      {[entry.views && `${entry.views} views`, entry.published, entry.channelLabel]
                        .filter(Boolean)
                        .join(" · ") || "On YouTube"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
