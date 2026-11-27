import { channels, getVideos } from "@/lib/content";
import { listThreads } from "@/lib/forums";
import { kvGet } from "@/lib/kv";
import { STORIES_KEY, isPublic, readStories } from "@/lib/stories";

const BASE_URL = "https://mickeychan.in";

export const revalidate = 3600;

// Only pages a visitor can read without an account. The sign in, account and
// console pages carry noindex and would be a contradiction in here.
const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/videos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/forums", changeFrequency: "daily", priority: 0.7 },
  { path: "/announcements", changeFrequency: "daily", priority: 0.85 },
  { path: "/stories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/studio", changeFrequency: "weekly", priority: 0.7 },
  { path: "/positions", changeFrequency: "daily", priority: 0.9 },
  { path: "/hub", changeFrequency: "daily", priority: 0.7 },
  { path: "/polls", changeFrequency: "weekly", priority: 0.6 },
  { path: "/events", changeFrequency: "weekly", priority: 0.6 },
  { path: "/ideas", changeFrequency: "weekly", priority: 0.6 },
  { path: "/socials", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/join", changeFrequency: "monthly", priority: 0.5 },
  { path: "/sitemap", changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap() {
  const now = new Date();

  let videos = [];
  try {
    videos = await getVideos();
  } catch {
    videos = [];
  }

  let stories = [];
  let threads = [];
  try {
    stories = readStories(await kvGet(STORIES_KEY, [])).filter((story) => isPublic(story));
  } catch {
    stories = [];
  }
  try {
    threads = await listThreads();
  } catch {
    threads = [];
  }

  const storyEntries = stories.slice(0, 60).map((story) => ({
    url: `${BASE_URL}/stories/${story.slug}`,
    lastModified: story.updatedAt ? new Date(story.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const threadEntries = threads.slice(0, 120).map((thread) => ({
    url: `${BASE_URL}/forums/${thread.id}`,
    lastModified: thread.updatedAt ? new Date(thread.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const channelEntries = channels.map((channel) => ({
    url: `${BASE_URL}/channels/${channel.handle}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const videoEntries = (videos || [])
    .filter((video) => video?.id)
    .slice(0, 500)
    .map((video) => {
      const published = video.publishedAt ? new Date(video.publishedAt) : null;
      return {
        url: `${BASE_URL}/videos/${video.id}`,
        lastModified: published && !Number.isNaN(published.getTime()) ? published : now,
        changeFrequency: "monthly",
        priority: 0.6,
      };
    });

  return [
    ...PAGES.map(({ path, changeFrequency, priority }) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...channelEntries,
    ...videoEntries,
    ...storyEntries,
    ...threadEntries,
  ];
}
