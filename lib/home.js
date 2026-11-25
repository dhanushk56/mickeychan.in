import { kvGet } from "@/lib/kv";

// One record drives every editorial part of the home page: the featured pick,
// the video of the week, the activity strip, the milestones and the members
// worth pointing at. Everything else on the page is derived from real data.
export const HOME_KEY = "home:config";

export const MAX_MILESTONES = 24;
export const MAX_MILESTONE_LABEL = 80;
export const MAX_MILESTONE_DETAIL = 180;
export const MAX_BLURB = 220;
export const MAX_FEATURED_MEMBERS = 6;

export const TICKER_KINDS = [
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "videos", label: "New videos" },
];

const KIND_IDS = TICKER_KINDS.map((entry) => entry.id);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function dateOnly(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return DATE_RE.test(trimmed) ? trimmed : "";
}

export function emptyHomeConfig() {
  return {
    featuredVideoId: "",
    videoOfWeek: { videoId: "", start: "", end: "", blurb: "" },
    // Uploads already have their own sections on the page, so the strip starts
    // with the two sources that would otherwise be invisible there.
    tickerKinds: ["announcements", "events"],
    milestones: [],
    featuredMembers: [],
  };
}

export function normalizeMilestone(input = {}, index = 0) {
  if (!input || typeof input !== "object") return null;
  const label = text(input.label, MAX_MILESTONE_LABEL);
  if (!label) return null;
  return {
    id: text(input.id, 40) || `m${index}${Date.now().toString(36).slice(-4)}`,
    label,
    detail: text(input.detail, MAX_MILESTONE_DETAIL),
    date: dateOnly(input.date),
  };
}

export function readHomeConfig(raw) {
  const base = emptyHomeConfig();
  if (!raw || typeof raw !== "object") return base;

  const week = raw.videoOfWeek && typeof raw.videoOfWeek === "object" ? raw.videoOfWeek : {};
  const start = dateOnly(week.start);
  const end = dateOnly(week.end);

  return {
    featuredVideoId: text(raw.featuredVideoId, 40),
    videoOfWeek: {
      videoId: text(week.videoId, 40),
      start,
      end: end && start && end >= start ? end : "",
      blurb: text(week.blurb, MAX_BLURB),
    },
    tickerKinds: Array.isArray(raw.tickerKinds)
      ? Array.from(new Set(raw.tickerKinds.filter((kind) => KIND_IDS.includes(kind))))
      : base.tickerKinds,
    milestones: Array.isArray(raw.milestones)
      ? raw.milestones
          .slice(0, MAX_MILESTONES)
          .map((entry, index) => normalizeMilestone(entry, index))
          .filter(Boolean)
      : [],
    featuredMembers: Array.isArray(raw.featuredMembers)
      ? Array.from(
          new Set(
            raw.featuredMembers
              .map((entry) => text(entry, 32).toLowerCase())
              .filter(Boolean)
          )
        ).slice(0, MAX_FEATURED_MEMBERS)
      : [],
  };
}

export async function getHomeConfig() {
  return readHomeConfig(await kvGet(HOME_KEY, {}));
}

function findVideo(videos, id) {
  if (!id) return null;
  return videos.find((video) => String(video.id) === String(id)) || null;
}

// The editor's pick wins while it still exists in the feed; otherwise the page
// falls back to its usual latest-upload behaviour.
export function pickFeaturedVideo(config, videos) {
  return findVideo(videos, config?.featuredVideoId);
}

// A scheduled pick only shows between its start and end dates. An empty window
// means "always", which is what a single unscheduled pick should do.
export function videoOfWeek(config, videos, now = Date.now()) {
  const week = config?.videoOfWeek;
  if (!week?.videoId) return null;
  const video = findVideo(videos, week.videoId);
  if (!video) return null;

  if (week.start) {
    const start = Date.parse(`${week.start}T00:00:00`);
    if (Number.isFinite(start) && now < start) return null;
  }
  if (week.end) {
    const end = Date.parse(`${week.end}T23:59:59`);
    if (Number.isFinite(end) && now > end) return null;
  }

  return { video, blurb: week.blurb };
}

function milestoneTime(milestone) {
  if (!milestone.date) return 0;
  const at = Date.parse(`${milestone.date}T00:00:00`);
  return Number.isFinite(at) ? at : 0;
}

// Newest first, undated entries last rather than first.
export function milestoneList(config, limit = 6) {
  return (config?.milestones || [])
    .slice()
    .sort((a, b) => milestoneTime(b) - milestoneTime(a))
    .slice(0, limit);
}

export function tickerEnabled(config, kind) {
  return Array.isArray(config?.tickerKinds) && config.tickerKinds.includes(kind);
}

// Builds the strip from whichever sources the editor left switched on. Items
// carry their own timestamps so the newest three, of any kind, come out on top.
export function tickerItems({ config, announcements = [], events = [], videos = [], now = Date.now(), limit = 4 } = {}) {
  const items = [];

  if (tickerEnabled(config, "announcements")) {
    announcements.slice(0, 6).forEach((entry) => {
      items.push({
        kind: "announcements",
        label: "Announcement",
        title: entry.title,
        href: "/announcements",
        at: Date.parse(entry.createdAt) || 0,
      });
    });
  }

  if (tickerEnabled(config, "events")) {
    events.slice(0, 6).forEach((entry) => {
      items.push({
        kind: "events",
        label: "Event",
        title: entry.title,
        href: "/events",
        at: Date.parse(entry.startsAt) || 0,
      });
    });
  }

  if (tickerEnabled(config, "videos")) {
    videos.slice(0, 6).forEach((entry) => {
      items.push({
        kind: "videos",
        label: "New video",
        title: entry.title,
        href: `/videos/${entry.id}`,
        at: entry.timestamp || (entry.publishedAt ? Date.parse(entry.publishedAt) : 0) || 0,
      });
    });
  }

  const future = Math.max(now, 0);
  return items
    .filter((item) => item.title)
    .filter((item) => !item.at || item.at <= future + 86400000)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, limit);
}
