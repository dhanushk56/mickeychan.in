import { channels, getVideos } from "@/lib/content";

const BASE_URL = "https://mickeychan.in";

export const revalidate = 3600;

const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/videos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/forums", changeFrequency: "daily", priority: 0.7 },
  { path: "/announcements", changeFrequency: "daily", priority: 0.85 },
  { path: "/stories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/positions", changeFrequency: "daily", priority: 0.9 },
  { path: "/socials", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/join", changeFrequency: "monthly", priority: 0.5 },
  { path: "/my-account", changeFrequency: "monthly", priority: 0.4 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/register", changeFrequency: "monthly", priority: 0.5 },
  { path: "/forgot-password", changeFrequency: "monthly", priority: 0.3 },
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
  ];
}
