export const STORIES_KEY = "stories:arcs";
export const MAX_STORIES = 60;
export const MAX_BEATS = 40;
export const MAX_CLUES = 60;

export const MAX_TITLE = 120;
export const MAX_SUMMARY = 400;
export const MAX_BEAT_TITLE = 120;
export const MAX_BEAT_TEXT = 2000;
export const MAX_CLUE_LABEL = 80;
export const MAX_CLUE_TEXT = 600;
export const MAX_CLUE_SOURCE = 120;

export const STORY_STATUSES = [
  { id: "live", label: "Running", badge: "badge-accepted", note: "Listed on the stories page." },
  { id: "draft", label: "Draft", badge: "badge-neutral", note: "Only the admin console sees it." },
  { id: "wrapped", label: "Wrapped", badge: "badge-pending", note: "Kept with its closing note." },
];

const STATUS_IDS = STORY_STATUSES.map((entry) => entry.id);

export function statusMeta(id) {
  return STORY_STATUSES.find((entry) => entry.id === id) || STORY_STATUSES[0];
}

function uid(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function day(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function uniqueSlug(list, slug, keepId) {
  const taken = new Set(
    (list || [])
      .filter((story) => story.id !== keepId)
      .map((story) => story.slug)
  );
  const base = slug || "story";
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function normalizeBeat(input = {}) {
  const title = text(input.title, MAX_BEAT_TITLE);
  const body = text(input.text, MAX_BEAT_TEXT);
  if (!title && !body) return null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("b"),
    title,
    text: body,
    at: day(input.at),
  };
}

function normalizeClue(input = {}) {
  const label = text(input.label, MAX_CLUE_LABEL);
  const body = text(input.text, MAX_CLUE_TEXT);
  if (!label && !body) return null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("c"),
    label,
    text: body,
    source: text(input.source, MAX_CLUE_SOURCE),
  };
}

export function normalizeStory(input = {}) {
  const title = text(input.title, MAX_TITLE);
  const beats = (Array.isArray(input.beats) ? input.beats : [])
    .map(normalizeBeat)
    .filter(Boolean)
    .slice(0, MAX_BEATS);
  const clues = (Array.isArray(input.clues) ? input.clues : [])
    .map(normalizeClue)
    .filter(Boolean)
    .slice(0, MAX_CLUES);
  const created = new Date(input.createdAt || Date.now()).getTime();
  const updated = new Date(input.updatedAt || Date.now()).getTime();

  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("s"),
    title,
    slug: slugify(input.slug || title),
    summary: text(input.summary, MAX_SUMMARY),
    status: STATUS_IDS.includes(input.status) ? input.status : "draft",
    beats,
    clues,
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
    updatedAt: new Date(Number.isNaN(updated) ? Date.now() : updated).toISOString(),
  };
}

export function readStories(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_STORIES)
    .map((entry) => normalizeStory(entry))
    .filter((entry) => entry.title);
}

export function isPublic(story) {
  return Boolean(story) && (story.status === "live" || story.status === "wrapped");
}

// Running arcs first, then the ones that wrapped, newest change on top.
export function sortStories(list) {
  const order = { live: 0, wrapped: 1, draft: 2 };
  return [...(list || [])].sort((a, b) => {
    const byStatus = (order[a.status] ?? 2) - (order[b.status] ?? 2);
    if (byStatus !== 0) return byStatus;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function findStory(list, key) {
  const wanted = String(key || "");
  return (list || []).find((story) => story.slug === wanted || story.id === wanted) || null;
}

export function sortedBeats(story) {
  const beats = [...(story?.beats || [])];
  return beats.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at.localeCompare(b.at);
  });
}

export function publishProblem(story) {
  if (!story?.title) return "Give the arc a title first.";
  if (!story.summary) return "Add one line that says what the arc was about.";
  if (story.beats.length === 0 && story.clues.length === 0) {
    return "Add a story beat or a clue before this goes live.";
  }
  return "";
}

export function storyDayCount(story) {
  const days = new Set((story?.beats || []).map((beat) => beat.at).filter(Boolean));
  return days.size;
}

export function latestBeat(story) {
  const beats = sortedBeats(story);
  return beats.length > 0 ? beats[beats.length - 1] : null;
}
