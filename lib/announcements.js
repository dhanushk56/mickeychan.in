// Announcements: one KV list, newest first.
//
// The rule the site applies when sorting them is deliberately simple and lives
// here so the page, the API and the admin panel can never disagree:
//
//   normal    → current until its window runs out (24 hours by default)
//   priority  → current until an admin deletes it
//   emergency → current until an admin deletes it, and listed first
//
// "Current" is therefore a question about the viewer's clock, not a field an
// admin has to remember to flip.

import { normalizeRichText, richTextIsEmpty } from "@/lib/rich-text";

export const ANNOUNCEMENTS_KEY = "announcements:list";
export const MAX_ANNOUNCEMENTS = 200;
export const DEFAULT_WINDOW_HOURS = 24;

export const LEVELS = [
  {
    id: "normal",
    label: "Standard",
    badge: "badge-neutral",
    rank: 2,
    note: "Moves to past announcements when its time is up.",
  },
  {
    id: "priority",
    label: "Priority",
    badge: "badge-pending",
    rank: 1,
    note: "Stays in current announcements until you delete it.",
  },
  {
    id: "emergency",
    label: "Emergency",
    badge: "badge-denied",
    rank: 0,
    note: "Stays in current announcements, listed above everything else.",
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function levelMeta(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `a_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function clampHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_WINDOW_HOURS;
  return Math.min(Math.max(Math.round(hours), 1), 720);
}

export function normalizeAnnouncement(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid(),
    title: String(input.title ?? "").trim().slice(0, 140),
    body: normalizeRichText(input.body),
    level: LEVEL_IDS.includes(input.level) ? input.level : "normal",
    windowHours: clampHours(input.windowHours),
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
    author: String(input.author || "Admin").slice(0, 60),
  };
}

// Everything read out of KV goes through here, so a half-written or hand-edited
// entry can't reach the page.
export function readAnnouncements(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_ANNOUNCEMENTS)
    .map((entry) => normalizeAnnouncement(entry));
}

export function isCurrent(announcement, now = Date.now()) {
  if (!announcement) return false;
  if (announcement.level !== "normal") return true;
  const created = new Date(announcement.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < announcement.windowHours * 60 * 60 * 1000;
}

// Milliseconds left in the current window, or null when it never ends.
export function timeLeftMs(announcement, now = Date.now()) {
  if (!isCurrent(announcement, now) || announcement.level !== "normal") return null;
  const created = new Date(announcement.createdAt).getTime();
  if (Number.isNaN(created)) return null;
  return created + announcement.windowHours * 60 * 60 * 1000 - now;
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
