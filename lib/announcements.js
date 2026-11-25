import { normalizeRichText, richTextIsEmpty, richTextToPlain } from "@/lib/rich-text";

export const ANNOUNCEMENTS_KEY = "announcements:list";
export const MAX_ANNOUNCEMENTS = 200;

export const MIN_WINDOW_HOURS = 1;
export const MAX_WINDOW_HOURS = 8760;

export const LEVELS = [
  {
    id: "normal",
    label: "Standard",
    badge: "badge-neutral",
    rank: 2,
    note: "Shows in Current until its time runs out.",
  },
  {
    id: "priority",
    label: "Priority",
    badge: "badge-pending",
    rank: 1,
    note: "Ranks above standard notices while it runs.",
  },
  {
    id: "emergency",
    label: "Emergency",
    badge: "badge-denied",
    rank: 0,
    note: "Ranks first in the list while it runs.",
  },
];

const LEVEL_IDS = LEVELS.map((level) => level.id);

export const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "channel", label: "Channel" },
  { id: "site", label: "Website" },
  { id: "community", label: "Community" },
  { id: "event", label: "Event" },
];

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export function levelMeta(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export function categoryMeta(id) {
  return CATEGORIES.find((category) => category.id === id) || CATEGORIES[0];
}

// Announcements can carry an optional image. Only a same-site path or an https
// URL is kept, so a stored record can never point at another scheme.
export function safeImageUrl(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 500) return "";
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  if (/^https:\/\//i.test(text)) return text;
  return "";
}

export function isValidWindowHours(value) {
  const hours = Number(value);
  return Number.isInteger(hours) && hours >= MIN_WINDOW_HOURS && hours <= MAX_WINDOW_HOURS;
}

function isoOrNull(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `a_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

export function normalizeAnnouncement(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  const createdAt = new Date(Number.isNaN(created) ? Date.now() : created).toISOString();
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid(),
    title: String(input.title ?? "").trim().slice(0, 140),
    body: normalizeRichText(input.body),
    level: LEVEL_IDS.includes(input.level) ? input.level : "normal",
    category: CATEGORY_IDS.includes(input.category) ? input.category : "general",
    pinned: input.pinned === true,
    image: safeImageUrl(input.image),
    windowHours: isValidWindowHours(input.windowHours) ? Number(input.windowHours) : null,
    // publishAt is when the notice becomes visible, expiresAt when it stops.
    // Older records carry neither and fall back to createdAt plus windowHours.
    publishAt: isoOrNull(input.publishAt) || createdAt,
    expiresAt: isoOrNull(input.expiresAt),
    createdAt,
    author: String(input.author || "Admin").slice(0, 60),
  };
}

export function readAnnouncements(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_ANNOUNCEMENTS)
    .map((entry) => normalizeAnnouncement(entry));
}

export function publishTime(announcement) {
  const time = new Date(announcement?.publishAt || announcement?.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

// An explicit end time wins. Otherwise the record runs for windowHours from the
// day it was written, which is how every older announcement behaves.
export function expiryTime(announcement) {
  if (!announcement) return null;
  if (announcement.expiresAt) {
    const explicit = new Date(announcement.expiresAt).getTime();
    if (!Number.isNaN(explicit)) return explicit;
  }
  const created = new Date(announcement.createdAt).getTime();
  if (Number.isNaN(created)) return null;
  if (!Number.isFinite(announcement.windowHours)) return null;
  return created + announcement.windowHours * 60 * 60 * 1000;
}

export function announcementState(announcement, now = Date.now()) {
  if (!announcement) return "past";
  if (publishTime(announcement) > now) return "scheduled";
  const end = expiryTime(announcement);
  if (end != null && now >= end) return "past";
  return "current";
}

export function isCurrent(announcement, now = Date.now()) {
  return announcementState(announcement, now) === "current";
}

// Scheduled notices stay out of every public view and API response until their
// publish time arrives.
export function publicAnnouncements(list, now = Date.now()) {
  return (list || []).filter((announcement) => announcementState(announcement, now) !== "scheduled");
}

export function timeLeftMs(announcement, now = Date.now()) {
  const end = expiryTime(announcement);
  if (end == null) return null;
  const left = end - now;
  return left > 0 ? left : null;
}

// Returns a message when a requested schedule cannot work, or an empty string.
export function scheduleProblem({ publishAt, expiresAt }) {
  const start = publishAt ? new Date(publishAt).getTime() : Date.now();
  if (Number.isNaN(start)) return "That publish time is not a real date.";
  if (!expiresAt) return "";
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return "That end time is not a real date.";
  if (end <= start) return "An announcement has to end after it goes live.";
  return "";
}

export function splitAnnouncements(list, now = Date.now()) {
  const current = [];
  const past = [];
  for (const announcement of list) {
    const state = announcementState(announcement, now);
    // Scheduled notices are not shown here at all; they arrive on their own.
    if (state === "scheduled") continue;
    (state === "current" ? current : past).push(announcement);
  }

  current.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const byLevel = levelMeta(a.level).rank - levelMeta(b.level).rank;
    if (byLevel !== 0) return byLevel;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  past.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { current, past };
}

export function announcementIsBlank(title, body) {
  return !String(title || "").trim() || richTextIsEmpty(body);
}

export function announcementText(announcement) {
  return richTextToPlain(announcement?.body, 4000).toLowerCase();
}

// Shared by the public page and the admin list so a search behaves the same in
// both places: title and body text, one category, and an inclusive date range.
export function filterAnnouncements(list, { query = "", category = "all", from = "", to = "" } = {}) {
  const term = String(query ?? "").trim().toLowerCase();
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;

  return (list || []).filter((announcement) => {
    if (category !== "all" && announcement.category !== category) return false;

    const created = new Date(announcement.createdAt).getTime();
    if (fromTime != null && !Number.isNaN(fromTime) && created < fromTime) return false;
    if (toTime != null && !Number.isNaN(toTime) && created > toTime) return false;

    if (!term) return true;
    return `${announcement.title} ${announcementText(announcement)}`.includes(term);
  });
}
