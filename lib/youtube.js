import { kvGet, kvSet } from "@/lib/kv";

// The Data API is the primary source for video metadata. Everything here
// degrades to `null` so lib/content.js can fall back to the existing scrape
// without ever throwing at a page render.

const API_BASE = "https://www.googleapis.com/youtube/v3";
const VIDEO_CACHE_MS = 15 * 60 * 1000;
const STATS_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_PLAYLIST_PAGES = 3;

export function isYouTubeApiConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

async function apiGet(path, params) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("missing_key");
  const url = new URL(`${API_BASE}/${path}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, value);
  }
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "no-store" });
  // Deliberately never include the URL: it carries the API key.
  if (!response.ok) throw new Error(`youtube_api_${response.status}`);
  return response.json();
}

export function formatCompactCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const oneDecimal = (n) => {
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };
  if (numeric >= 1e9) return `${oneDecimal(numeric / 1e9)}B`;
  if (numeric >= 1e6) return `${oneDecimal(numeric / 1e6)}M`;
  if (numeric >= 1e3) return `${oneDecimal(numeric / 1e3)}K`;
  return String(Math.round(numeric));
}

export function parseDurationSeconds(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

export function isoDurationToSeconds(iso) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ""));
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days || 0) * 86400 +
    Number(hours || 0) * 3600 +
    Number(minutes || 0) * 60 +
    Number(seconds || 0);
  return total > 0 ? total : null;
}

export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = Math.floor(total % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function isoDurationFromSeconds(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = Math.floor(total % 60);
  let value = "PT";
  if (hours) value += `${hours}H`;
  if (minutes) value += `${minutes}M`;
  if (rest || (!hours && !minutes)) value += `${rest}S`;
  return value;
}

function publishedLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isShort({ durationSeconds, title, description }) {
  const haystack = `${title || ""} ${description || ""}`;
  if (/#shorts?\b/i.test(haystack)) return true;
  // Shorts are vertical and up to three minutes; the API does not expose the
  // aspect ratio, so a one-minute cutoff plus the hashtag keeps this honest.
  return Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= 65;
}

export function normalizeApiVideo(item) {
  const id = item?.id;
  const snippet = item?.snippet || {};
  const details = item?.contentDetails || {};
  const stats = item?.statistics || {};
  const title = String(snippet.title || "").trim();
  if (!id || !title) return null;

  const durationSeconds = isoDurationToSeconds(details.duration);
  const viewCount = Number(stats.viewCount);
  const publishedAt = snippet.publishedAt || "";
  const description = String(snippet.description || "").slice(0, 4000);
  const tags = Array.isArray(snippet.tags) ? snippet.tags.slice(0, 20) : [];

  return {
    id,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    type: isShort({ durationSeconds, title, description }) ? "short" : "video",
    published: publishedLabel(publishedAt),
    publishedAt,
    timestamp: publishedAt ? Date.parse(publishedAt) || 0 : 0,
    views: Number.isFinite(viewCount) && viewCount > 0 ? formatCompactCount(viewCount) : "",
    viewCount: Number.isFinite(viewCount) && viewCount > 0 ? viewCount : null,
    duration: formatDuration(durationSeconds),
    durationSeconds: durationSeconds || null,
    description,
    tags,
    channelId: snippet.channelId || "",
    channelTitle: snippet.channelTitle || "",
    source: "api",
  };
}

function cacheFresh(cached, ttl, field) {
  if (!cached) return null;
  const fetchedAt = Date.parse(cached.fetchedAt || "");
  if (!Number.isFinite(fetchedAt)) return null;
  if (Date.now() - fetchedAt > ttl) return null;
  return field ? cached[field] : cached;
}

export async function fetchChannelVideos(channel) {
  if (!isYouTubeApiConfigured()) return null;

  const key = `yt:api:uploads:${channel.channelId}`;
  const cached = cacheFresh(await kvGet(key, null), VIDEO_CACHE_MS, "videos");
  if (Array.isArray(cached)) return cached;

  try {
    const info = await apiGet("channels", {
      part: "contentDetails",
      id: channel.channelId,
      maxResults: "1",
    });
    const uploads = info?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return null;

    const ids = [];
    let pageToken = "";
    for (let page = 0; page < MAX_PLAYLIST_PAGES; page += 1) {
      const list = await apiGet("playlistItems", {
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "50",
        pageToken,
      });
      for (const item of list?.items || []) {
        const id = item?.contentDetails?.videoId;
        if (id) ids.push(id);
      }
      pageToken = list?.nextPageToken || "";
      if (!pageToken) break;
    }

    const videos = [];
    for (let index = 0; index < ids.length; index += 50) {
      const batch = ids.slice(index, index + 50).join(",");
      const detail = await apiGet("videos", {
        part: "snippet,contentDetails,statistics",
        id: batch,
        maxResults: "50",
      });
      for (const item of detail?.items || []) {
        const video = normalizeApiVideo(item);
        if (video) videos.push(video);
      }
    }

    if (videos.length === 0) return null;
    await kvSet(key, { fetchedAt: new Date().toISOString(), videos });
    return videos;
  } catch {
    return null;
  }
}

export async function fetchVideoFromApi(id) {
  if (!isYouTubeApiConfigured() || !id) return null;
  try {
    const data = await apiGet("videos", {
      part: "snippet,contentDetails,statistics",
      id,
      maxResults: "1",
    });
    return normalizeApiVideo((data?.items || [])[0]);
  } catch {
    return null;
  }
}

export async function fetchChannelStats(channel) {
  if (!isYouTubeApiConfigured()) return null;

  const key = `yt:api:stats:${channel.channelId}`;
  const cached = cacheFresh(await kvGet(key, null), STATS_CACHE_MS, "stats");
  if (cached) return cached;

  try {
    const data = await apiGet("channels", {
      part: "snippet,statistics",
      id: channel.channelId,
      maxResults: "1",
    });
    const item = (data?.items || [])[0];
    if (!item) return null;
    const stats = item.statistics || {};
    const subscribers = Number(stats.subscriberCount);
    const views = Number(stats.viewCount);
    const videos = Number(stats.videoCount);
    const normalized = {
      title: item.snippet?.title || "",
      description: String(item.snippet?.description || "").slice(0, 1000),
      subscribers: Number.isFinite(subscribers) && subscribers > 0 ? subscribers : null,
      hiddenSubscribers: stats.hiddenSubscriberCount === true,
      views: Number.isFinite(views) && views > 0 ? views : null,
      videos: Number.isFinite(videos) && videos > 0 ? videos : null,
      source: "api",
    };
    await kvSet(key, { fetchedAt: new Date().toISOString(), stats: normalized });
    return normalized;
  } catch {
    return null;
  }
}
