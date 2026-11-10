"use client";

import { useEffect, useMemo, useState } from "react";

function VideoCard({ video, onPlay }) {
  const isShort = video.type === "short";
  return (
    <button
      type="button"
      className="glass-card video-card lift"
      onClick={() => onPlay(video)}
      aria-label={`Play ${video.title}`}
    >
      <div
        className="video-thumb"
        data-short={isShort}
        style={{ backgroundImage: `url(${video.thumbnail})` }}
      >
        <span className="play-badge" aria-hidden="true">▶</span>
        <span className="thumb-pill">{isShort ? "Short" : "Video"}</span>
        {video.duration && <span className="thumb-badge">{video.duration}</span>}
      </div>
      <div className="video-body">
        <p className="video-title">{video.title}</p>
        <p className="faint text-xs mt-1.5">
          {[video.views && `${video.views} views`, video.published, video.channelLabel]
            .filter(Boolean)
            .join(" · ") || "On YouTube"}
        </p>
      </div>
    </button>
  );
}

export default function VideoExplorer({ videos, initialId = "", channelUrl, channels = [] }) {
  const [filter, setFilter] = useState("all");
  const [channel, setChannel] = useState("all");
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!initialId) return;
    const match = videos.find((video) => video.id === initialId);
    if (match) setActive(match);
  }, [initialId, videos]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event) => {
      if (event.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [active]);

  const videosInChannel = useMemo(
    () => (channel === "all" ? videos : videos.filter((video) => video.channel === channel)),
    [channel, videos]
  );

  const counts = useMemo(
    () => ({
      all: videosInChannel.length,
      video: videosInChannel.filter((video) => video.type !== "short").length,
      short: videosInChannel.filter((video) => video.type === "short").length,
    }),
    [videosInChannel]
  );

  const videosInType = useMemo(
    () =>
      filter === "all"
        ? videos
        : videos.filter((video) => (video.type === "short" ? "short" : "video") === filter),
    [filter, videos]
  );

  const channelCounts = useMemo(() => {
    const map = { all: videosInType.length };
    for (const item of channels) {
      map[item.id] = videosInType.filter((video) => video.channel === item.id).length;
    }
    return map;
  }, [channels, videosInType]);

  const channelTotals = useMemo(() => {
    const map = {};
    for (const item of channels) {
      map[item.id] = videos.filter((video) => video.channel === item.id).length;
    }
    return map;
  }, [channels, videos]);

  const visible = useMemo(
    () =>
      videos.filter((video) => {
        const matchesType = filter === "all" || (video.type === "short" ? "short" : "video") === filter;
        const matchesChannel = channel === "all" || video.channel === channel;
        return matchesType && matchesChannel;
      }),
    [channel, filter, videos]
  );

  const emptyForChannel = channel !== "all" && (channelTotals[channel] || 0) === 0;
  const selectedChannel = channels.find((item) => item.id === channel);

  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <p className="font-display text-lg font-bold">Nothing here yet</p>
        <p className="muted text-sm max-w-md">
          The channel couldn&apos;t be reached right now. Head over to YouTube to watch the latest.
        </p>
        <a href={channelUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm mt-2">
          Watch on YouTube ↗
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {channels.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="faint text-xs font-bold uppercase" style={{ letterSpacing: ".14em" }}>
              Channel
            </span>
            {[{ id: "all", label: "Both" }, ...channels].map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip"
                data-active={channel === item.id}
                aria-pressed={channel === item.id}
                onClick={() => setChannel(item.id)}
              >
                {item.label}
                <span className="tab-count">{channelCounts[item.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="tabbar" role="tablist" aria-label="Filter videos">
            {[
              { id: "all", label: "Everything" },
              { id: "video", label: "Videos" },
              { id: "short", label: "Shorts" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={filter === tab.id}
                className="tab"
                data-active={filter === tab.id}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                <span className="tab-count">{counts[tab.id]}</span>
              </button>
            ))}
          </div>
          <p className="faint text-xs">{visible.length} showing</p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p className="font-display text-lg font-bold">
            {emptyForChannel ? `Nothing on ${selectedChannel?.label?.toLowerCase()} yet` : "No matches"}
          </p>
          <p className="muted text-sm max-w-md">
            {emptyForChannel
              ? "This account has no public uploads right now. Everything from the main channel is still here."
              : "Try a different filter."}
          </p>
          {emptyForChannel && selectedChannel?.url && (
            <a
              href={selectedChannel.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm mt-2"
            >
              Check it on YouTube ↗
            </a>
          )}
        </div>
      ) : (
        <div className="video-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start">
          {visible.map((video) => (
            <VideoCard key={video.id} video={video} onPlay={setActive} />
          ))}
        </div>
      )}

      {active && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="relative">
              <iframe
                className="modal-video"
                data-short={active.type === "short"}
                src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                type="button"
                onClick={() => setActive(null)}
                className="icon-button absolute top-3 right-3"
                aria-label="Close video"
                style={{ background: "rgba(8,5,16,.6)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
              >
                ✕
              </button>
            </div>
            <div className="p-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold leading-snug">{active.title}</p>
                <p className="faint text-xs mt-1">
                  {[active.views && `${active.views} views`, active.published, active.duration, active.channelLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={active.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Open on YouTube ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
