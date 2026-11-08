const BASE_URL = "https://mickeychan.in";

// Only pages a stranger could usefully land on. /admin, /form-builder and
// /form-builder/apply/[id] are signed-in screens, and /login and /register are
// just doors into the site — none of them are reading material for a crawler.
const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/videos", changeFrequency: "weekly", priority: 0.9 },
  { path: "/announcements", changeFrequency: "daily", priority: 0.85 },
  { path: "/positions", changeFrequency: "daily", priority: 0.9 },
  { path: "/socials", changeFrequency: "monthly", priority: 0.7 },
  { path: "/join", changeFrequency: "monthly", priority: 0.6 },
];

// Next serves this at /sitemap.xml and regenerates it on every build, so the
// dates always match what is actually deployed.
export default function sitemap() {
  const lastModified = new Date();

  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
