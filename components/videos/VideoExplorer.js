"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const TYPES = [
  { id: "all", label: "Everything" },
  { id: "video", label: "Videos" },
  { id: "short", label: "Shorts" },
];

const DURATIONS = [
  { id: "all", label: "Any length" },
  { id: "under-5", label: "Under 5 min" },
  { id: "5-15", label: "5–15 min" },
  { id: "15-30", label: "15–30 min" },
  { id: "over-30", label: "30 min and up" },
  { id: "unknown", label: "No duration listed" },
];

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "views-desc", label: "Most viewed" },
  { id: "views-asc", label: "Least viewed" },
  { id: "longest", label: "Longest first" },
  { id: "shortest", label: "Shortest first" },
  { id: "az", label: "Title A–Z" },
];

const URL_KEYS = ["q", "channel", "type", "duration", "year", "tag", "sort"];

function videoType(video) {
  return video.type === "short" ? "short" : "video";
}

function viewsOf(video) {
  return Number.isFinite(video.viewCount) ? video.viewCount : 0;
}

function secondsOf(video) {
  return Number.isFinite(video.durationSeconds) ? video.durationSeconds : null;
}

function yearOf(video) {
  const year = Number(String(video.publishedAt || "").slice(0, 4));
  return Number.isFinite(year) && year >= 2005 ? String(year) : "";
}

// YouTube caps Shorts at three minutes, so a short whose duration the scrape
// could not read is still shorter than every band except "under 5 min".
const SHORT_MAX_SECONDS = 180;

function matchesDuration(video, band) {
  if (band === "all") return true;
  const seconds = secondsOf(video);
  const known = seconds != null ? seconds : videoType(video) === "short" ? SHORT_MAX_SECONDS : null;
  if (band === "unknown") return known == null;
  if (known == null) return false;
  if (band === "under-5") return known < 300;
  if (band === "5-15") return known >= 300 && known < 900;
  if (band === "15-30") return known >= 900 && known < 1800;
  if (band === "over-30") return known >= 1800;
  return true;
}

function searchText(video) {
  return [video.title, video.description, video.channelLabel, ...(video.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function VideoCard({ video, onPlay }) {
  const isShort = video.type === "short";
  return (
    <div className="glass-card video-card lift">
      <button
        type="button"
        className="video-thumb video-thumb-button"
        data-short={isShort}
        style={{ backgroundImage: `url(${video.thumbnail})` }}
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title} without leaving the site`}
      >
        <span className="play-badge" aria-hidden="true">▶</span>
        <span className="thumb-pill">{isShort ? "Short" : "Video"}</span>
        {video.duration && <span className="thumb-badge">{video.duration}</span>}
      </button>
      <div className="video-body">
        <Link href={`/videos/${video.id}`} className="video-title hover:underline">
          {video.title}
        </Link>
        <p className="faint text-xs mt-1.5">
          {[video.views && `${video.views} views`, video.published, video.channelLabel]
            .filter(Boolean)
            .join(" · ") || "On YouTube"}
        </p>
      </div>
    </div>
  );
}

export default function VideoExplorer({ videos, initialId = "", channelUrl, channels = [] }) {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [type, setType] = useState("all");
  const [duration, setDuration] = useState("all");
  const [year, setYear] = useState("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState("");
  const urlReady = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = {};
    for (const key of URL_KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    if (Object.keys(next).length > 0) {
      if (next.q) setQuery(next.q);
      if (next.channel) setChannel(next.channel);
      if (next.type) setType(next.type);
      if (next.duration) setDuration(next.duration);
      if (next.year) setYear(next.year);
      if (next.tag) setTag(next.tag);
      if (next.sort) setSort(next.sort);
    }
    urlReady.current = true;
  }, []);

  useEffect(() => {
    if (!urlReady.current) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (channel !== "all") params.set("channel", channel);
    if (type !== "all") params.set("type", type);
    if (duration !== "all") params.set("duration", duration);
    if (year !== "all") params.set("year", year);
    if (tag) params.set("tag", tag);
    if (sort !== "newest") params.set("sort", sort);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [query, channel, type, duration, year, tag, sort]);

  useEffect(() => {
    if (!initialId) return;
    const match = videos.find((video) => video.id === initialId);
    if (match) setActive(match);
  }, [initialId, videos]);

  useEffect(() => {
    if (!active) return undefined;
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

  const years = useMemo(() => {
    const set = new Set(videos.map(yearOf).filter(Boolean));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [videos]);

  const tags = useMemo(() => {
    const counts = new Map();
    for (const video of videos) {
      for (const item of video.tags || []) {
        const label = String(item || "").trim();
        if (!label) continue;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 16)
      .map(([label, count]) => ({ label, count }));
  }, [videos]);

  const suggestions = useMemo(() => {
    const set = new Set(tags.map((item) => item.label));
    for (const video of videos.slice(0, 20)) set.add(video.title);
    return Array.from(set).slice(0, 24);
  }, [tags, videos]);

  const channelCounts = useMemo(() => {
    const map = { all: videos.length };
    for (const item of channels) map[item.id] = 0;
    for (const video of videos) map[video.channel] = (map[video.channel] || 0) + 1;
    return map;
  }, [channels, videos]);

  const typeCounts = useMemo(() => {
    const scoped = channel === "all" ? videos : videos.filter((video) => video.channel === channel);
    return {
      all: scoped.length,
      video: scoped.filter((video) => videoType(video) === "video").length,
      short: scoped.filter((video) => videoType(video) === "short").length,
    };
  }, [channel, videos]);

  const durationCounts = useMemo(() => {
    const scoped = videos.filter((video) => {
      if (channel !== "all" && video.channel !== channel) return false;
      if (type !== "all" && videoType(video) !== type) return false;
      if (year !== "all" && yearOf(video) !== year) return false;
      return true;
    });
    const map = { all: scoped.length };
    for (const band of DURATIONS) {
      if (band.id === "all") continue;
      map[band.id] = scoped.filter((video) => matchesDuration(video, band.id)).length;
    }
    return map;
  }, [channel, type, videos, year]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = videos.filter((video) => {
      if (channel !== "all" && video.channel !== channel) return false;
      if (type !== "all" && videoType(video) !== type) return false;
      if (year !== "all" && yearOf(video) !== year) return false;
      if (!matchesDuration(video, duration)) return false;
      if (tag && !(video.tags || []).includes(tag)) return false;
      if (needle && !searchText(video).includes(needle)) return false;
      return true;
    });

    const sorted = [...list];
    if (sort === "newest") {
      sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else if (sort === "views-desc") {
      sorted.sort((a, b) => viewsOf(b) - viewsOf(a));
    } else if (sort === "views-asc") {
      sorted.sort((a, b) => viewsOf(a) - viewsOf(b));
    } else if (sort === "longest") {
      sorted.sort((a, b) => (secondsOf(b) || 0) - (secondsOf(a) || 0));
    } else if (sort === "shortest") {
      sorted.sort((a, b) => (secondsOf(a) || Number.MAX_SAFE_INTEGER) - (secondsOf(b) || Number.MAX_SAFE_INTEGER));
    } else if (sort === "az") {
      sorted.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    }
    return sorted;
  }, [channel, duration, query, sort, tag, type, videos, year]);

  const filtersActive =
    query.trim().length > 0 ||
    channel !== "all" ||
    type !== "all" ||
    duration !== "all" ||
    year !== "all" ||
    tag !== "" ||
    sort !== "newest";

  function clearFilters() {
    setQuery("");
    setChannel("all");
    setType("all");
    setDuration("all");
    setYear("all");
    setTag("");
    setSort("newest");
  }

  function playRandom() {
    if (visible.length === 0) return;
    setActive(visible[Math.floor(Math.random() * visible.length)]);
  }

  async function copyLink(video) {
    const url = `${window.location.origin}/videos/${video.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(video.id);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  }

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
      <div className="glass-card p-4 md:p-5 grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field flex-1" style={{ minWidth: "16rem" }}>
            <span className="field-label">Search</span>
            <div className="relative flex items-center">
              <input
                className="input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, description, tag or channel"
                list="video-search-suggestions"
                aria-label="Search videos"
                style={{ paddingRight: "2.6rem" }}
              />
              {query && (
                <button
                  type="button"
                  className="icon-button absolute right-1.5"
                  style={{ width: "1.9rem", height: "1.9rem" }}
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <datalist id="video-search-suggestions">
              {suggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          {channels.length > 1 && (
            <label className="field" style={{ minWidth: "11rem" }}>
              <span className="field-label">Channel</span>
              <select
                className="select"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                aria-label="Filter by channel"
              >
                <option value="all">Both channels ({channelCounts.all})</option>
                {channels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.label} ({channelCounts[item.id] ?? 0})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field" style={{ minWidth: "9.5rem" }}>
            <span className="field-label">Show</span>
            <select
              className="select"
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-label="Filter by video type"
            >
              {TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({typeCounts[item.id] ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: "9.5rem" }}>
            <span className="field-label">Length</span>
            <select
              className="select"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              aria-label="Filter by length"
            >
              {DURATIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({durationCounts[item.id] ?? 0})
                </option>
              ))}
            </select>
          </label>

          {years.length > 0 && (
            <label className="field" style={{ minWidth: "8rem" }}>
              <span className="field-label">Year</span>
              <select
                className="select"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                aria-label="Filter by year"
              >
                <option value="all">Any year</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field" style={{ minWidth: "10.5rem" }}>
            <span className="field-label">Sort</span>
            <select
              className="select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort videos"
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((item) => (
            <button
              key={item.label}
              type="button"
              className="chip"
              data-active={tag === item.label}
              onClick={() => setTag(tag === item.label ? "" : item.label)}
              aria-pressed={tag === item.label}
            >
              #{item.label} <span className="opacity-60">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="faint text-xs" aria-live="polite">
            {visible.length} of {videos.length} showing
            {tag ? ` · tagged #${tag}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2" style={{ marginLeft: "auto" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={playRandom} disabled={visible.length === 0}>
              🎲 Random
            </button>
            {filtersActive && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p className="font-display text-lg font-bold">No videos match that</p>
          <p className="muted text-sm max-w-md">
            Try a shorter search, or clear the filters to see everything again.
          </p>
          <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="video-grid grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-start">
          {visible.map((video) => (
            <VideoCard key={video.id} video={video} onPlay={setActive} />
          ))}
        </div>
      )}

      {active && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
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
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/videos/${active.id}`} className="btn btn-primary btn-sm">
                  Video page ↗
                </Link>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyLink(active)}>
                  {copied === active.id ? "Copied!" : "Copy link"}
                </button>
                <a href={active.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  YouTube ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
