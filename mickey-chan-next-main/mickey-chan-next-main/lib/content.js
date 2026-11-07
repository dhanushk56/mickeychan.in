const CACHE_SECONDS = 300;
const YOUTUBE_CHANNEL_ID = "UCJhF67Sy9EIfxVjzer-iCHg";
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

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

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const entry = match[1];
    const id = getTag(entry, "yt:videoId");
    const title = getTag(entry, "title");
    const publishedAt = getTag(entry, "published");
    const thumbnail = getAttribute(entry, "media:thumbnail", "url") || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const lowerTitle = title.toLowerCase();
    const isShort = /#shorts?|short\s*#|\bshorts\b/.test(lowerTitle);

    return {
      id,
      slug: id,
      title,
      publishedAt,
      date: relativeDate(publishedAt),
      thumbnail,
      url: `https://www.youtube.com/watch?v=${id}`,
      type: isShort ? "short" : "video",
    };
  }).filter((video) => video.id && video.title);
}

export async function getVideos() {
  try {
    const response = await fetch(YOUTUBE_FEED_URL, {
      next: { revalidate: CACHE_SECONDS },
      headers: { Accept: "application/atom+xml, application/xml" },
    });
    if (!response.ok) return [];
    return parseFeed(await response.text());
  } catch {
    return [];
  }
}

export async function getSubmissions() {
  return [];
}
