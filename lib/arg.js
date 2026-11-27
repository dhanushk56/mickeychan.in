import { kvGet, kvSet } from "@/lib/kv";

// The ARG is three short lists plus one small record per solver. Storylines,
// clues and puzzles are read whole on every page view, so they stay small and
// ordered, while progress is written per member and never read across accounts.

export const STORYLINES_KEY = "arg:storylines";
export const CLUES_KEY = "arg:clues";
export const PUZZLES_KEY = "arg:puzzles";

export const progressKey = (username) =>
  `arg:progress:${String(username || "").trim().toLowerCase()}`;

export const MAX_STORYLINES = 40;
export const MAX_CLUES = 200;
export const MAX_PUZZLES = 200;
export const MAX_TITLE = 100;
export const MAX_BLURB = 400;
export const MAX_BODY = 1200;
export const MAX_PROMPT = 500;
export const MAX_HINT = 300;
export const MAX_MESSAGE = 400;
export const MAX_ANSWER = 120;

export const STORY_STATUSES = [
  { id: "upcoming", label: "Upcoming", badge: "badge-pending" },
  { id: "active", label: "Active", badge: "badge-accepted" },
  { id: "completed", label: "Completed", badge: "badge-neutral" },
  { id: "archived", label: "Archived", badge: "badge-neutral" },
];

const STATUS_IDS = STORY_STATUSES.map((entry) => entry.id);

export function storyStatusMeta(id) {
  return STORY_STATUSES.find((entry) => entry.id === id) || STORY_STATUSES[0];
}

function uid(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function stamp(value) {
  const at = new Date(value || Date.now()).getTime();
  return new Date(Number.isNaN(at) ? Date.now() : at).toISOString();
}

export function slugify(value) {
  return text(value, MAX_TITLE)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Answers are compared loosely on purpose: case, spacing and punctuation should
// never decide whether someone opened a lock they actually understood.
function flatten(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeStoryline(input = {}) {
  const title = text(input.title, MAX_TITLE);
  const slug = slugify(input.slug || title) || uid("mystery");
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("s"),
    slug,
    title,
    blurb: text(input.blurb, MAX_BLURB),
    status: STATUS_IDS.includes(input.status) ? input.status : "upcoming",
    difficulty: text(input.difficulty || "Unrated", 40),
    startedAt: input.startedAt ? stamp(input.startedAt) : null,
    endedAt: input.endedAt ? stamp(input.endedAt) : null,
    sort: Number.isFinite(Number(input.sort)) ? Number(input.sort) : Date.now(),
    createdAt: stamp(input.createdAt),
  };
}

export function normalizeClue(input = {}) {
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("c"),
    storylineId: text(input.storylineId, 40),
    title: text(input.title, MAX_TITLE),
    body: text(input.body, MAX_BODY),
    source: text(input.source, 120),
    puzzleId: text(input.puzzleId, 40) || null,
    createdAt: stamp(input.createdAt),
  };
}

export function normalizePuzzle(input = {}) {
  const choices = Array.isArray(input.choices)
    ? Array.from(new Set(input.choices.map((choice) => text(choice, 80)).filter(Boolean))).slice(0, 6)
    : [];
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("p"),
    storylineId: text(input.storylineId, 40),
    title: text(input.title, MAX_TITLE),
    prompt: text(input.prompt, MAX_PROMPT),
    hint: text(input.hint, MAX_HINT),
    choices,
    answer: text(input.answer, MAX_ANSWER),
    message: text(input.message, MAX_MESSAGE) || "The lock opens.",
    points: Number.isFinite(Number(input.points)) ? Math.max(0, Math.min(500, Number(input.points))) : 10,
    createdAt: stamp(input.createdAt),
  };
}

function readList(raw, normalize, max) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, max)
    .map(normalize);
}

export function readStorylines(raw) {
  return readList(raw, normalizeStoryline, MAX_STORYLINES).filter((entry) => entry.title);
}

export function readClues(raw) {
  return readList(raw, normalizeClue, MAX_CLUES).filter((entry) => entry.title);
}

export function readPuzzles(raw) {
  return readList(raw, normalizePuzzle, MAX_PUZZLES).filter((entry) => entry.title && entry.answer);
}

export async function listStorylines() {
  const raw = await kvGet(STORYLINES_KEY, null);
  if (raw === null) return DEFAULT_STORYLINES.map(normalizeStoryline);
  return readStorylines(raw);
}

export async function listClues() {
  const raw = await kvGet(CLUES_KEY, null);
  if (raw === null) return DEFAULT_CLUES.map(normalizeClue);
  return readClues(raw);
}

export async function listPuzzles() {
  const raw = await kvGet(PUZZLES_KEY, null);
  if (raw === null) return DEFAULT_PUZZLES.map(normalizePuzzle);
  return readPuzzles(raw);
}

export async function readProgress(username) {
  if (!username) return { solved: [], found: [], updatedAt: null };
  const raw = await kvGet(progressKey(username), null);
  const solved = Array.isArray(raw?.solved) ? raw.solved.map((id) => String(id)).slice(0, 500) : [];
  const found = Array.isArray(raw?.found) ? raw.found.map((id) => String(id)).slice(0, 500) : [];
  return {
    solved: Array.from(new Set(solved)),
    found: Array.from(new Set(found)),
    updatedAt: raw?.updatedAt || null,
  };
}

async function saveProgress(username, progress) {
  await kvSet(progressKey(username), {
    solved: progress.solved,
    found: progress.found,
    updatedAt: new Date().toISOString(),
  });
}

export function answerMatches(puzzle, attempt) {
  const given = flatten(attempt);
  if (!given) return false;
  const accepted = [puzzle.answer, ...(Array.isArray(puzzle.alternates) ? puzzle.alternates : [])];
  return accepted.some((answer) => flatten(answer) === given);
}

// A clue with no gate is readable by everyone. A gated clue stays sealed, body
// and all, until the puzzle it points at is solved by this member.
export function cluesForViewer(clues, progress) {
  const solved = new Set(progress?.solved || []);
  const found = new Set(progress?.found || []);
  return clues.map((clue) => {
    const locked = Boolean(clue.puzzleId) && !solved.has(clue.puzzleId) && !found.has(clue.id);
    return {
      ...clue,
      locked,
      body: locked ? "" : clue.body,
    };
  });
}

export function storyProgress(storyline, puzzles, progress) {
  const solved = new Set(progress?.solved || []);
  const mine = puzzles.filter((puzzle) => puzzle.storylineId === storyline.id);
  const opened = mine.filter((puzzle) => solved.has(puzzle.id)).length;
  return {
    total: mine.length,
    opened,
    complete: mine.length > 0 && opened === mine.length,
  };
}

export function achievementsFor({ storylines, puzzles, progress, clues }) {
  const solved = new Set(progress?.solved || []);
  const found = new Set(progress?.found || []);
  const earned = [];

  if (solved.size > 0) earned.push({ id: "first-lock", label: "First lock open" });
  if (solved.size >= 3) earned.push({ id: "code-breaker", label: "Code breaker" });
  if (found.size > 0) earned.push({ id: "first-clue", label: "Clue collector" });
  if (storylines.some((storyline) => storyProgress(storyline, puzzles, progress).complete)) {
    earned.push({ id: "mystery-solver", label: "Mystery solver" });
  }
  if (clues.length > 0 && found.size >= clues.filter((clue) => clue.puzzleId).length && clues.some((clue) => clue.puzzleId)) {
    earned.push({ id: "all-clues", label: "Nothing left buried" });
  }

  return earned;
}

export async function solvePuzzle({ username, puzzleId, answer }) {
  if (!username) return { status: 401, error: "Log in so the site can keep your progress." };

  const puzzles = await listPuzzles();
  const puzzle = puzzles.find((entry) => entry.id === puzzleId);
  if (!puzzle) return { status: 404, error: "That lock is not part of the story anymore." };

  const progress = await readProgress(username);
  if (progress.solved.includes(puzzle.id)) {
    return { ok: true, already: true, message: puzzle.message, clues: [] };
  }

  if (!answerMatches(puzzle, answer)) {
    return { status: 400, error: "That is not it. Read the clue again and try another answer." };
  }

  const clues = await listClues();
  const unlocked = clues.filter((clue) => clue.puzzleId === puzzle.id);
  const nextFound = Array.from(new Set([...progress.found, ...unlocked.map((clue) => clue.id)]));

  await saveProgress(username, {
    solved: [...progress.solved, puzzle.id],
    found: nextFound,
  });

  return {
    ok: true,
    message: puzzle.message,
    points: puzzle.points,
    clues: unlocked.map((clue) => ({ id: clue.id, title: clue.title })),
  };
}

export async function upsertStoryline(input = {}) {
  const list = await listStorylines();
  const next = normalizeStoryline(input);
  if (!next.title) return { error: "Give the mystery a title." };
  const clash = list.find((entry) => entry.slug === next.slug && entry.id !== next.id);
  if (clash) next.slug = `${next.slug}-${next.id.slice(-4)}`;
  const exists = list.some((entry) => entry.id === next.id);
  const merged = exists ? list.map((entry) => (entry.id === next.id ? next : entry)) : [next, ...list];
  await kvSet(STORYLINES_KEY, merged.slice(0, MAX_STORYLINES));
  return { storyline: next };
}

export async function removeStoryline(id) {
  const [storylines, clues, puzzles] = await Promise.all([listStorylines(), listClues(), listPuzzles()]);
  await kvSet(
    STORYLINES_KEY,
    storylines.filter((entry) => entry.id !== id)
  );
  // A mystery takes its own clues and locks with it, so nothing is left pointing
  // at a page that no longer exists.
  await kvSet(
    CLUES_KEY,
    clues.filter((entry) => entry.storylineId !== id)
  );
  await kvSet(
    PUZZLES_KEY,
    puzzles.filter((entry) => entry.storylineId !== id)
  );
  return { ok: true };
}

export async function upsertClue(input = {}) {
  const list = await listClues();
  const next = normalizeClue(input);
  if (!next.title || !next.body) return { error: "A clue needs a title and the clue itself." };
  if (!next.storylineId) return { error: "Pick the mystery this clue belongs to." };
  const exists = list.some((entry) => entry.id === next.id);
  const merged = exists ? list.map((entry) => (entry.id === next.id ? next : entry)) : [next, ...list];
  await kvSet(CLUES_KEY, merged.slice(0, MAX_CLUES));
  return { clue: next };
}

export async function removeClue(id) {
  const list = await listClues();
  await kvSet(
    CLUES_KEY,
    list.filter((entry) => entry.id !== id)
  );
  return { ok: true };
}

export async function upsertPuzzle(input = {}) {
  const list = await listPuzzles();
  const next = normalizePuzzle(input);
  if (!next.title || !next.prompt || !next.answer) {
    return { error: "A lock needs a title, the question and its answer." };
  }
  if (!next.storylineId) return { error: "Pick the mystery this lock belongs to." };
  if (next.choices.length > 0 && !next.choices.some((choice) => flatten(choice) === flatten(next.answer))) {
    return { error: "The answer has to be one of the choices." };
  }
  const exists = list.some((entry) => entry.id === next.id);
  const merged = exists ? list.map((entry) => (entry.id === next.id ? next : entry)) : [next, ...list];
  await kvSet(PUZZLES_KEY, merged.slice(0, MAX_PUZZLES));
  return { puzzle: next };
}

export async function removePuzzle(id) {
  const [puzzles, clues] = await Promise.all([listPuzzles(), listClues()]);
  await kvSet(
    PUZZLES_KEY,
    puzzles.filter((entry) => entry.id !== id)
  );
  // Clues that pointed at the lock become plain clues instead of vanishing, so
  // the writing survives a deleted puzzle.
  await kvSet(
    CLUES_KEY,
    clues.map((clue) => (clue.puzzleId === id ? { ...clue, puzzleId: null } : clue))
  );
  return { ok: true };
}

// Starter content so /arg works the day it ships. It is only used while the
// store has never been written; once an admin saves anything, these are replaced.
const DEFAULT_STORYLINES = [
  {
    id: "s_deepslate",
    slug: "the-deepslate-transmission",
    title: "The Deepslate Transmission",
    blurb:
      "A voice under the world keeps repeating a coordinate. Follow the clues, open the locks, and find out what is answering.",
    status: "active",
    difficulty: "Starter",
    startedAt: "2026-11-20T18:00:00.000Z",
    sort: 1,
  },
];

const DEFAULT_CLUES = [
  {
    id: "c_frame",
    storylineId: "s_deepslate",
    title: "The frame at 04:12",
    body:
      "In the last challenge video the camera holds on a broken portal frame for four seconds. Count the obsidian blocks down the left side. That number is the first key.",
    source: "Video, 04:12",
  },
  {
    id: "c_reply",
    storylineId: "s_deepslate",
    title: "What the voice says back",
    body:
      "Two words, said together in the dark, and the chat answers with a coordinate that is not on any map. Write it down before it scrolls away.",
    source: "Unlocked by the first lock",
    puzzleId: "p_words",
  },
];

const DEFAULT_PUZZLES = [
  {
    id: "p_words",
    storylineId: "s_deepslate",
    title: "Two words in the dark",
    prompt:
      "The recording repeats two words, one after the other. Enter them together, in the order they are spoken.",
    hint: "Listen at 04:12, then again at 04:40.",
    answer: "deepslate echo",
    message: "The frame lights up. A coordinate arrives in chat, and it points below the map.",
    points: 10,
  },
  {
    id: "p_count",
    storylineId: "s_deepslate",
    title: "The number on the frame",
    prompt: "How many obsidian blocks sit down the left side of the broken frame?",
    hint: "Count again. The bottom corner counts too.",
    answer: "7",
    message: "Seven. The frame was never a door. It is a keypad.",
    points: 10,
  },
  {
    id: "p_first",
    storylineId: "s_deepslate",
    title: "Which block spoke first",
    prompt: "The voice names one block before it says anything else. Which one?",
    choices: ["Deepslate", "Echo", "Obsidian"],
    answer: "Deepslate",
    message: "Deepslate first, and everything after it is an answer to that name.",
    points: 10,
  },
];
