import { kvGet } from "@/lib/kv";

export const EVENTS_KEY = "events:list";
export const MAX_EVENTS = 100;
export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 600;
export const MAX_LOCATION = 80;

function uid() {
  try {
    return `e_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `e_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

// Only same-site paths and https links survive, so a stored event can never
// point a member at a javascript: or data: URL.
export function safeLink(value) {
  const text = String(value ?? "").trim().slice(0, 400);
  if (!text) return "";
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  if (/^https:\/\//i.test(text)) return text;
  return "";
}

function isoOrNull(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function normalizeEvent(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  const start = isoOrNull(input.startsAt);
  const end = isoOrNull(input.endsAt);
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid(),
    title: String(input.title ?? "").trim().slice(0, MAX_TITLE),
    description: String(input.description ?? "").trim().slice(0, MAX_DESCRIPTION),
    startsAt: start,
    endsAt: end && start && end > start ? end : null,
    location: String(input.location ?? "").trim().slice(0, MAX_LOCATION),
    url: safeLink(input.url),
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
    author: String(input.author || "Admin").slice(0, 60),
  };
}

export function readEvents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_EVENTS)
    .map((entry) => normalizeEvent(entry))
    .filter((entry) => entry.title && entry.startsAt);
}

function endTime(event) {
  const end = event.endsAt ? new Date(event.endsAt).getTime() : null;
  const start = new Date(event.startsAt).getTime();
  return Number.isFinite(end) && end > start ? end : start;
}

// An event stays "upcoming" until its end time (or its start, when it has no
// end) passes, so a stream that runs all evening doesn't vanish at 8pm.
export function splitEvents(list, now = Date.now()) {
  const upcoming = [];
  const past = [];
  for (const event of list) {
    if (endTime(event) > now) upcoming.push(event);
    else past.push(event);
  }
  upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return { upcoming, past };
}

export async function listEvents() {
  return readEvents(await kvGet(EVENTS_KEY, []));
}
