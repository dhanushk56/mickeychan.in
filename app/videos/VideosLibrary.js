"use client";

import { useMemo, useState } from "react";

const MEDIA_TABS = [
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
];

const SORT_OPTIONS = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
];

function VideoCard({ video }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="glass-card rounded-2xl overflow-hidden video-card">
      <div className="video-placeholder" style={{ backgroundImage: `url(${video.thumbnail})` }} role="img" aria-label={`Thumbnail for ${video.title}`} />
      <div className="p-5">
        <h3 className="font-semibold text-base mb-2 leading-snug">{video.title}</h3>
        <p className="text-sm text-black/45 dark:text-white/45">{video.date}</p>
      </div>
    </a>
  );
}

export default function VideosLibrary({ videos }) {
  const [activeTab, setActiveTab] = useState("videos");
  const [sortBy, setSortBy] = useState("latest");

  const sortedVideos = useMemo(() => {
    const items = videos.filter((video) => (activeTab === "shorts" ? video.type === "short" : video.type !== "short"));
    return [...items].sort((a, b) => {
      const aDate = new Date(a.publishedAt).getTime() || 0;
      const bDate = new Date(b.publishedAt).getTime() || 0;
      return sortBy === "oldest" ? aDate - bDate : bDate - aDate;
    });
  }, [activeTab, sortBy, videos]);

  if (videos.length === 0) {
    return <div className="glass-card rounded-2xl p-8 text-black/60 dark:text-white/60">YouTube videos are temporarily unavailable. Please try again later.</div>;
  }

  return (
    <>
      <div className="glass-card rounded-2xl p-5 mb-8 text-sm text-black/65 dark:text-white/65">
        Videos are fetched directly from YouTube&apos;s public channel feed—no API key required. YouTube only includes recent uploads in this feed, and Shorts are identified by a #shorts label in the title or description.
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8">
        <div className="inline-flex w-fit gap-2 p-1 rounded-full bg-black/5 dark:bg-white/5" aria-label="Choose videos or shorts">
          {MEDIA_TABS.map((tab) => {
            const count = videos.filter((video) => (tab.id === "shorts" ? video.type === "short" : video.type !== "short")).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={activeTab === tab.id ? "btn-primary !py-2 !px-5" : "btn-secondary !py-2 !px-5"}
              >
                {tab.label}<span className="text-xs opacity-75">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-black/60 dark:text-white/60">
          Sort by
          <select className="form-input !w-auto !min-h-0 !py-2" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {sortedVideos.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-black/60 dark:text-white/60">No {activeTab} found in the recent YouTube feed.</div>
      ) : (
        <>
          <p className="text-sm text-black/45 dark:text-white/45 mb-5">{sortedVideos.length} recent {activeTab === "shorts" ? "shorts" : "videos"}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedVideos.map((video) => <VideoCard key={video.id} video={video} />)}
          </div>
        </>
      )}
    </>
  );
}
