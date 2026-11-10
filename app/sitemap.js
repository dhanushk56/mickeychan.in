const BASE_URL = "https://mickeychan.in";

const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/videos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/announcements", changeFrequency: "daily", priority: 0.85 },
  { path: "/positions", changeFrequency: "daily", priority: 0.9 },
  { path: "/socials", changeFrequency: "monthly", priority: 0.7 },
  { path: "/join", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap() {
  const lastModified = new Date();

  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
