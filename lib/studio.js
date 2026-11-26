export const STUDIO_KEY = "studio:content";

export const MAX_UPCOMING = 40;
export const MAX_NOTES = 60;

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function uid(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function day(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeUpcoming(input = {}) {
  const title = text(input.title, 120);
  if (!title) return null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("u"),
    title,
    note: text(input.note, 300),
    when: day(input.when),
  };
}

function normalizeNote(input = {}) {
  const title = text(input.title, 120);
  const body = text(input.text, 1200);
  if (!title && !body) return null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("n"),
    title,
    text: body,
    at: day(input.at),
  };
}

export function normalizeStudio(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    upcoming: (Array.isArray(source.upcoming) ? source.upcoming : [])
      .map(normalizeUpcoming)
      .filter(Boolean)
      .slice(0, MAX_UPCOMING),
    notes: (Array.isArray(source.notes) ? source.notes : []).map(normalizeNote).filter(Boolean).slice(0, MAX_NOTES),
  };
}

export function readStudio(raw) {
  return normalizeStudio(raw || {});
}

export function sortedUpcoming(studio) {
  return [...(studio?.upcoming || [])].sort((a, b) => {
    if (!a.when && !b.when) return 0;
    if (!a.when) return 1;
    if (!b.when) return -1;
    return a.when.localeCompare(b.when);
  });
}

export function sortedNotes(studio) {
  return [...(studio?.notes || [])].sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return b.at.localeCompare(a.at);
  });
}
