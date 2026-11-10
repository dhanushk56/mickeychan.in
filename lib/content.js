import { videos as fallbackVideos } from "@/data/videos";
import { kvGet, kvSet } from "@/lib/kv";


const CACHE_SECONDS = 600;

export const channels = [
  {
    id: "main",
    label: "Main account",
    handle: "mickeychaan",
    channelId: "UCJhF67Sy9EIfxVjzer-iCHg",
  },
  {
    id: "second",
    label: "Second account",
    handle: "MickeyInReal",
    channelId: "UCdURBYgHs2qx8TEs6tYmN-A",
  },
].map((channel) => ({ ...channel, url: `https://www.youtube.com/@${channel.handle}` }));

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

function thumbnailFor(id, type = "video") {
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

async function fetchRss(channel) {
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,
      { headers: BROWSER_HEADERS, next: { revalidate: CACHE_SECONDS } }
    );
    if (!response.ok) return [];
    return parseRss(await response.text());
  } catch {
    return [];
  }
}


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

async function fetchChannelTab(channel, tab) {
  try {
    const response = await fetch(`https://www.youtube.com/channel/${channel.channelId}/${tab}`, {
      headers: BROWSER_HEADERS,
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return [];
    const data = readInitialData(await response.text());
    if (!data) return [];
    if (tab === "shorts") return parseShorts(data);
    const videos = parseVideoLockups(data);
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

const PER_CHANNEL = 18;

function tag(video, channel) {
  return {
    ...video,
    channel: channel.id,
    channelLabel: channel.label,
    channelUrl: channel.url,
  };
}

async function fetchChannel(channel) {
  const [rss, videos, shorts] = await Promise.all([
    fetchRss(channel),
    fetchChannelTab(channel, "videos"),
    fetchChannelTab(channel, "shorts"),
  ]);

  const long = dedupe([...videos, ...rss.filter((video) => video.type !== "short")]).slice(0, PER_CHANNEL);
  const vertical = dedupe([...shorts, ...rss.filter((video) => video.type === "short")]).slice(0, PER_CHANNEL);

  return [...long, ...vertical].map((video) => tag(video, channel));
}


const SUBS_CACHE_KEY = "youtube:subs";
const SUBS_TTL_MS = 6 * 60 * 60 * 1000;

function oneDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function compactCount(value) {
  const match = String(value).match(/([\d.,]+)\s*([KMB])?/i);
  if (!match) return "";
  const suffix = (match[2] || "").toUpperCase();
  if (suffix) return `${match[1].replace(/,/g, "")}${suffix}`;
  const numeric = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 1e9) return `${oneDecimal(numeric / 1e9)}B`;
  if (numeric >= 1e6) return `${oneDecimal(numeric / 1e6)}M`;
  if (numeric >= 1e3) return `${oneDecimal(numeric / 1e3)}K`;
  return String(Math.round(numeric));
}

function parseSubscribers(html) {
  const patterns = [
    /"subscriberCountText":\{[^}]*?"(?:simpleText|content)":"([^"]*?)"/,
    /"content":"([\d.,]+\s*[KMB]?)\s+subscribers"/i,
    /([\d.,]+\s*[KMB]?)\s+subscribers/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const compact = compactCount(match[1]);
    if (compact) return compact;
  }
  return "";
}

async function fetchSubscribers(channel) {
  try {
    const response = await fetch(`https://www.youtube.com/@${channel.handle}`, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!response.ok) return "";
    return parseSubscribers(await response.text());
  } catch {
    return "";
  }
}

export async function getChannelSubscribers() {
  const cached = await kvGet(SUBS_CACHE_KEY, null);
  const isFresh =
    cached?.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < SUBS_TTL_MS;
  let counts = cached?.counts && typeof cached.counts === "object" ? cached.counts : {};

  if (!isFresh) {
    const fetched = await Promise.all(channels.map((channel) => fetchSubscribers(channel)));
    const next = { ...counts };
    channels.forEach((channel, index) => {
      if (fetched[index]) next[channel.id] = fetched[index];
    });
    if (Object.keys(next).length > 0) {
      counts = next;
      await kvSet(SUBS_CACHE_KEY, { fetchedAt: new Date().toISOString(), counts });
    }
  }

  return channels.map((channel) => ({
    id: channel.id,
    label: channel.label,
    handle: channel.handle,
    url: channel.url,
    subscribers: counts[channel.id] || "",
  }));
}

export async function getVideos() {
  const perChannel = await Promise.all(channels.map((channel) => fetchChannel(channel)));
  const fresh = dedupe(perChannel.flat());

  if (fresh.length > 0) return fresh;
  return fallbackVideos.map((video) => tag(video, channels[0]));
}

export const channelUrl = channels[0].url;
