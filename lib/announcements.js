
import { normalizeRichText, richTextIsEmpty } from "@/lib/rich-text";

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

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function levelMeta(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export function isValidWindowHours(value) {
  const hours = Number(value);
  return Number.isInteger(hours) && hours >= MIN_WINDOW_HOURS && hours <= MAX_WINDOW_HOURS;
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
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid(),
    title: String(input.title ?? "").trim().slice(0, 140),
    body: normalizeRichText(input.body),
    level: LEVEL_IDS.includes(input.level) ? input.level : "normal",
    windowHours: isValidWindowHours(input.windowHours) ? Number(input.windowHours) : null,
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
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

export function endsAt(announcement) {
  if (!announcement) return null;
  const created = new Date(announcement.createdAt).getTime();
  if (Number.isNaN(created)) return null;
  if (!Number.isFinite(announcement.windowHours)) return null;
  return created + announcement.windowHours * 60 * 60 * 1000;
}

export function isCurrent(announcement, now = Date.now()) {
  if (!announcement) return false;
  const end = endsAt(announcement);
  if (end == null) return true;
  return now < end;
}

export function timeLeftMs(announcement, now = Date.now()) {
  const end = endsAt(announcement);
  if (end == null) return null;
  const left = end - now;
  return left > 0 ? left : null;
}

export function splitAnnouncements(list, now = Date.now()) {
  const current = [];
  const past = [];
  for (const announcement of list) {
    (isCurrent(announcement, now) ? current : past).push(announcement);
  }

  current.sort((a, b) => {
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
