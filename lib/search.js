import { kvGet } from "@/lib/kv";
import { channels, VIDEO_CACHE_KEY } from "@/lib/content";
import { videos as fallbackVideos } from "@/data/videos";
import { ANNOUNCEMENTS_KEY, publicAnnouncements, readAnnouncements } from "@/lib/announcements";
import { STORIES_KEY, isPublic, readStories, sortedBeats } from "@/lib/stories";
import { listEvents } from "@/lib/events";
import { categoryMeta, listThreads } from "@/lib/forums";
import { richTextToPlain } from "@/lib/rich-text";

export const MIN_QUERY_LENGTH = 2;

const PAGES = [
  { title: "Videos", href: "/videos", text: "Every upload and short, playable on the site." },
  {
    title: "Community hub",
    href: "/hub",
    text: "Polls, ideas, the calendar and what is happening on the channel.",
  },
  { title: "Announcements", href: "/announcements", text: "Current notices and the past archive." },
  { title: "Forums", href: "/forums", text: "Threads and replies from the community." },
  { title: "Stories", href: "/stories", text: "Story arcs, beat by beat." },
  { title: "Studio", href: "/studio", text: "What is coming up, and notes from behind the scenes." },
  { title: "Socials", href: "/socials", text: "Every channel and server in one place." },
  { title: "Open positions", href: "/positions", text: "Roles on the team and how to apply." },
  { title: "Events", href: "/events", text: "Streams, meetups and what is coming up." },
  { title: "Polls", href: "/polls", text: "Vote on what gets made next." },
  { title: "Ideas", href: "/ideas", text: "Suggestions from the community." },
  { title: "Contact", href: "/contact", text: "Send the team a note about a collab or the site." },
  { title: "Sitemap", href: "/sitemap", text: "Every page on mickeychan.in." },
];

const GROUP_LABELS = {
  videos: "Videos",
  announcements: "Announcements",
  stories: "Stories",
  events: "Events",
  forums: "Forum threads",
  pages: "Pages",
};

const LIMITS = { videos: 8, announcements: 4, stories: 4, events: 4, forums: 6, pages: 6 };

function clean(value, max = 400) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function termsOf(query) {
  return [...new Set(String(query || "").toLowerCase().split(/\s+/).filter((term) => term.length >= 2))];
}

function scoreEntry(entry, terms) {
  const title = entry.title.toLowerCase();
  const text = entry.text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const inTitle = title.includes(term);
    if (!inTitle && !text.includes(term)) return 0;
    score += inTitle ? 4 : 1;
  }
  return score;
}

function excerptOf(entry, terms, length = 170) {
  const text = clean(entry.text, 4000);
  if (!text) return "";
  const lower = text.toLowerCase();
  const hits = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  if (hits.length === 0) return text.slice(0, length) + (text.length > length ? "…" : "");
  const start = Math.max(0, Math.min(...hits) - 40);
  const cut = text.slice(start, start + length);
  return `${start > 0 ? "…" : ""}${cut}${start + length < text.length ? "…" : ""}`;
}

function channelLabel(channel) {
  const match = channels.find((entry) => entry.handle === channel);
  return match ? match.label : "";
}

function videoEntries(cached) {
  const list = Array.isArray(cached?.videos) && cached.videos.length > 0 ? cached.videos : fallbackVideos;
  return list
    .filter((video) => video && video.id && video.title)
    .map((video) => ({
      title: clean(video.title, 160),
      text: clean([video.duration, video.published, channelLabel(video.channel)].filter(Boolean).join(" ")),
      href: `/videos/${video.id}`,
      meta: video.type === "short" ? "Short" : "Video",
    }));
}

export async function searchSite(rawQuery) {
  const query = clean(rawQuery, 100);
  const terms = termsOf(query);
  if (terms.length === 0) {
    return { query, terms, groups: [], total: 0 };
  }

  const now = Date.now();
  const [videoCache, announcementRaw, storyRaw, events, threads] = await Promise.all([
    kvGet(VIDEO_CACHE_KEY, null).catch(() => null),
    kvGet(ANNOUNCEMENTS_KEY, []).catch(() => []),
    kvGet(STORIES_KEY, []).catch(() => []),
    listEvents().catch(() => []),
    listThreads().catch(() => []),
  ]);

  const groups = [
    { id: "videos", label: GROUP_LABELS.videos, items: videoEntries(videoCache) },
    {
      id: "announcements",
      label: GROUP_LABELS.announcements,
      items: publicAnnouncements(readAnnouncements(announcementRaw), now).map((announcement) => ({
        title: clean(announcement.title, 160),
        text: richTextToPlain(announcement.body, 1500),
        href: "/announcements",
        meta: "Announcement",
      })),
    },
    {
      id: "stories",
      label: GROUP_LABELS.stories,
      items: readStories(storyRaw)
        .filter(isPublic)
        .map((story) => ({
          title: clean(story.title, 160),
          text: [story.summary, ...sortedBeats(story).map((beat) => beat.title)].filter(Boolean).join(" "),
          href: `/stories/${story.slug}`,
          meta: story.status === "live" ? "Running" : "Wrapped",
        })),
    },
    {
      id: "events",
      label: GROUP_LABELS.events,
      items: events.map((event) => ({
        title: clean(event.title, 160),
        text: [event.description, event.location].filter(Boolean).join(" "),
        href: "/events",
        meta: "Event",
      })),
    },
    {
      id: "forums",
      label: GROUP_LABELS.forums,
      items: threads.map((thread) => ({
        title: clean(thread.title, 160),
        text: thread.body,
        href: `/forums/${thread.id}`,
        meta: categoryMeta(thread.category).label,
      })),
    },
    { id: "pages", label: GROUP_LABELS.pages, items: PAGES.map((page) => ({ ...page, meta: "Page" })) },
  ];

  const result = [];
  for (const group of groups) {
    const matched = group.items
      .map((item) => ({ ...item, excerpt: excerptOf(item, terms), score: scoreEntry(item, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMITS[group.id]);
    if (matched.length > 0) result.push({ id: group.id, label: group.label, items: matched });
  }

  return {
    query,
    terms,
    groups: result,
    total: result.reduce((sum, group) => sum + group.items.length, 0),
  };
}
