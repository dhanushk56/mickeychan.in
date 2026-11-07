const CACHE_SECONDS = 3600;
const YOUTUBE_CHANNEL_ID = "UCJhF67Sy9EIfxVjzer-iCHg";
const YOUTUBE_UPLOADS_PLAYLIST_ID = "UUJhF67Sy9EIfxVjzer-iCHg";
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getTag(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function getAttribute(entry, tag, attribute) {
  const match = entry.match(new RegExp(`<${tag}[^>]*\\s${attribute}=["']([^"']+)["']`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function relativeDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently uploaded";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function parseDuration(duration = "") {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}

function isShort(title = "", description = "", durationSeconds = 0) {
  // The YouTube Data API does not expose a Shorts flag. Use the #shorts label
  // when present, and otherwise classify videos within the Shorts duration limit.
  return /#shorts?\b/i.test(`${title} ${description}`) || (durationSeconds > 0 && durationSeconds <= 180);
}

function videoFromApi(item) {
  const snippet = item.snippet || {};
  const details = item.contentDetails || {};
  const id = item.id;
  const publishedAt = snippet.publishedAt || "";
  const durationSeconds = parseDuration(details.duration);
  return {
    id,
    slug: id,
    title: snippet.title || "Untitled video",
    publishedAt,
    date: relativeDate(publishedAt),
    thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
    type: isShort(snippet.title, snippet.description, durationSeconds) ? "short" : "video",
    viewCount: Number(item.statistics?.viewCount || 0),
  };
}

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const entry = match[1];
    const id = getTag(entry, "yt:videoId");
    const title = getTag(entry, "title");
    const publishedAt = getTag(entry, "published");
    const thumbnail = getAttribute(entry, "media:thumbnail", "url") || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    return {
      id,
      slug: id,
      title,
      publishedAt,
      date: relativeDate(publishedAt),
      thumbnail,
      url: `https://www.youtube.com/watch?v=${id}`,
      type: isShort(title) ? "short" : "video",
      viewCount: 0,
    };
  }).filter((video) => video.id && video.title);
}

async function fetchYouTubeApi(path, params, apiKey) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) {
    if (value) url.searchParams.set(key, value);
  }
  const response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!response.ok) throw new Error(`YouTube API request failed (${response.status})`);
  return response.json();
}

async function getAllPlaylistItems(apiKey) {
  const items = [];
  let pageToken;
  do {
    const page = await fetchYouTubeApi("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: YOUTUBE_UPLOADS_PLAYLIST_ID,
      maxResults: PAGE_SIZE,
      pageToken,
    }, apiKey);
    items.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

async function getVideoDetails(ids, apiKey) {
  const videos = [];
  for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
    const page = await fetchYouTubeApi("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.slice(offset, offset + PAGE_SIZE).join(","),
    }, apiKey);
    videos.push(...(page.items || []));
  }
  return videos;
}

async function getAllVideosFromApi(apiKey) {
  const playlistItems = await getAllPlaylistItems(apiKey);
  const ids = playlistItems.map((item) => item.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const details = await getVideoDetails(ids, apiKey);
  const detailsById = new Map(details.map((video) => [video.id, video]));
  // Keep the playlist order as the canonical upload order, even if an item is
  // unavailable or omitted from the videos endpoint.
  return ids.map((id) => detailsById.get(id)).filter(Boolean).map(videoFromApi);
}

async function getRecentFeedVideos() {
  const response = await fetch(YOUTUBE_FEED_URL, {
    next: { revalidate: CACHE_SECONDS },
    headers: { Accept: "application/atom+xml, application/xml" },
  });
  if (!response.ok) return [];
  return parseFeed(await response.text());
}

export async function getVideos() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      return { videos: await getAllVideosFromApi(apiKey), complete: true };
    } catch (error) {
      console.error("Unable to load the full YouTube uploads playlist:", error);
    }
  }

  try {
    return { videos: await getRecentFeedVideos(), complete: false };
  } catch {
    return { videos: [], complete: false };
  }
}

export async function getSubmissions() {
  return [];
}
