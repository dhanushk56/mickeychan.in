import { videos as fallbackVideos } from "@/data/videos";

// YouTube's RSS feed (feeds/videos.xml?channel_id=...) is disabled for some
// channels — it returns 404 even though the channel is live. So instead of
// relying on it, we read the channel's own pages and pull the data YouTube
// itself renders. RSS is still tried first (cheap, stable) and the baked
// fallback in data/videos.js is used if YouTube can't be reached at all.

const CHANNEL_HANDLE = "mickeychaan";
const CHANNEL_ID = "UCJhF67Sy9EIfxVjzer-iCHg";
const CHANNEL_URL = `https://www.youtube.com/@${CHANNEL_HANDLE}`;
const CACHE_SECONDS = 600;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

function thumbnailFor(id, type = "video") {
  // Shorts are vertical — oar2 keeps the original aspect ratio instead of
  // letterboxing a 16:9 still.
  return `https://i.ytimg.com/vi/${id}/${type === "short" ? "oar2" : "hqdefault"}.jpg`;
}

function parseCompactViews(text = "") {
  const match = text.match(/([\d.,]+)\s*(thousand|million|billion)?\s*views?/i);
  if (!match) return "";
  const suffix = { thousand: "K", million: "M", billion: "B" }[(match[2] || "").toLowerCase()] || "";
  return `${match[1]}${suffix}`;
}

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

// --- RSS (works for most channels) -----------------------------------------

function parseRss(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)]
    .map((match) => {
      const entry = match[1];
      const id = getTag(entry, "yt:videoId");
      const title = getTag(entry, "title");
      if (!id || !title) return null;
      const published = getTag(entry, "published");
      const date = new Date(published);
      return {
        id,
        title,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: thumbnailFor(id),
        type: /#shorts?|\bshorts\b/i.test(title) ? "short" : "video",
        published: Number.isNaN(date.getTime())
          ? ""
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        timestamp: Number.isNaN(date.getTime()) ? 0 : date.getTime(),
        views: "",
        duration: "",
      };
    })
    .filter(Boolean);
}

async function fetchRss() {
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      headers: BROWSER_HEADERS,
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return [];
    return parseRss(await response.text());
  } catch {
    return [];
  }
}

// --- Channel pages ----------------------------------------------------------

function readInitialData(html) {
  const patterns = [
    /var ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/,
    /window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      return JSON.parse(match[1]);
    } catch {
      // Try the next pattern.
    }
  }
  return null;
}

function collect(root, key, out = []) {
  if (!root || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    for (const item of root) collect(item, key, out);
    return out;
  }
  if (root[key]) out.push(root[key]);
  for (const value of Object.values(root)) collect(value, key, out);
  return out;
}

function textOf(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node.content === "string") return node.content;
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((run) => run.text || "").join("");
  return "";
}

function metadataParts(lockup) {
  const rows = lockup?.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
  return rows.flatMap((row) => (row.metadataParts || []).map((part) => textOf(part.text))).filter(Boolean);
}

function durationOf(lockup) {
  const overlays = lockup?.contentImage?.thumbnailViewModel?.overlays || [];
  for (const overlay of overlays) {
    const badges = overlay.thumbnailBottomOverlayViewModel?.badges || [];
    for (const badge of badges) {
      const text = badge.thumbnailBadgeViewModel?.text;
      if (text && /^\d+(:\d+)+$/.test(text)) return text;
    }
  }
  return "";
}

function normalizeVideo(id, { title, published = "", views = "", duration = "", type = "video" } = {}) {
  if (!id || !title) return null;
  return {
    id,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: thumbnailFor(id, type),
    type,
    published,
    views,
    duration,
  };
}

function parseVideoLockups(data) {
  return collect(data, "lockupViewModel")
    .filter((lockup) => (/^\/watch\?v=/.test(lockup?.rendererContext?.commandContext?.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url || "") ||
      lockup?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" ||
      Boolean(lockup?.contentId && lockup?.metadata?.lockupMetadataViewModel?.title)))
    .map((lockup) => {
      const [views, published] = metadataParts(lockup);
      return normalizeVideo(lockup.contentId, {
        title: textOf(lockup.metadata?.lockupMetadataViewModel?.title),
        views: views || "",
        published: published || "",
        duration: durationOf(lockup),
      });
    })
    .filter(Boolean);
}

function parseShorts(data) {
  return collect(data, "shortsLockupViewModel")
    .map((short) => {
      const id =
        short?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
        String(short?.entityId || "").replace("shorts-shelf-item-", "");
      const accessibility = short?.accessibilityText || "";
      const title = textOf(short?.overlayMetadata?.primaryText) ||
        accessibility.replace(/,\s*[\d.,]+\s*(thousand|million|billion)?\s*views?\b[\s\S]*$/i, "").trim();
      return normalizeVideo(id, { title, views: parseCompactViews(accessibility), type: "short" });
    })
    .filter(Boolean);
}

async function fetchChannelTab(tab) {
  try {
    const response = await fetch(`${CHANNEL_URL}/${tab}`, {
      headers: BROWSER_HEADERS,
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return [];
    const data = readInitialData(await response.text());
    if (!data) return [];
    if (tab === "shorts") return parseShorts(data);
    const videos = parseVideoLockups(data);
    // Older channel pages still use videoRenderer, parse those too.
    const legacy = collect(data, "videoRenderer").map((v) =>
      normalizeVideo(v.videoId, {
        title: textOf(v.title),
        published: v.publishedTimeText?.simpleText || "",
        views: v.viewCountText?.simpleText || "",
        duration: v.lengthText?.simpleText || "",
      })
    );
    return [...videos, ...legacy];
  } catch {
    return [];
  }
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((video) => {
    if (!video || seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });
}

export async function getVideos() {
  const [rss, videos, shorts] = await Promise.all([fetchRss(), fetchChannelTab("videos"), fetchChannelTab("shorts")]);

  // Keep both formats well represented instead of filling the whole list with
  // long-form uploads and cutting every short off at the end.
  const long = dedupe([...videos, ...rss.filter((video) => video.type !== "short")]).slice(0, 18);
  const vertical = dedupe([...shorts, ...rss.filter((video) => video.type === "short")]).slice(0, 18);
  const fresh = [...long, ...vertical];

  if (fresh.length > 0) return fresh;
  return fallbackVideos;
}

export const channelUrl = CHANNEL_URL;
