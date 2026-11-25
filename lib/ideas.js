import { kvGet } from "@/lib/kv";

export const IDEAS_KEY = "ideas:list";
export const MAX_IDEAS = 200;
export const MAX_IDEA_TITLE = 120;
export const MAX_IDEA_NOTE = 600;

export const IDEA_STATUSES = [
  { id: "open", label: "Open", badge: "badge-neutral" },
  { id: "planned", label: "Planned", badge: "badge-pending" },
  { id: "shipped", label: "Shipped", badge: "badge-accepted" },
  { id: "declined", label: "Not this time", badge: "badge-denied" },
];

const STATUS_IDS = IDEA_STATUSES.map((status) => status.id);

export function ideaStatusMeta(id) {
  return IDEA_STATUSES.find((status) => status.id === id) || IDEA_STATUSES[0];
}

function uid() {
  try {
    return `i_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `i_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

export function normalizeIdea(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  const votes = Array.isArray(input.votes) ? Array.from(new Set(input.votes.map((name) => String(name)).filter(Boolean))) : [];
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid(),
    title: String(input.title ?? "").trim().slice(0, MAX_IDEA_TITLE),
    note: String(input.note ?? "").trim().slice(0, MAX_IDEA_NOTE),
    status: STATUS_IDS.includes(input.status) ? input.status : "open",
    votes: votes.slice(0, 5000),
    author: String(input.author || "").slice(0, 40),
    authorName: String(input.authorName || "").slice(0, 60),
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
  };
}

export function readIdeas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_IDEAS)
    .map((entry) => normalizeIdea(entry))
    .filter((entry) => entry.title);
}

// One vote count for every reader. The stored idea carries the list of backers, while
// pages and the API hand the browser only the number, so ranking read those two shapes
// differently and a single idea could rank as zero backed everywhere it was reordered.
export function ideaVoteCount(idea) {
  if (Array.isArray(idea?.votes)) return idea.votes.length;
  const count = Number(idea?.voteCount);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

// Most-backed first; ties fall back to the newest idea so a fresh post is never
// buried under older ones with the same count.
export function rankIdeas(list) {
  return [...list].sort((a, b) => {
    const byVotes = ideaVoteCount(b) - ideaVoteCount(a);
    if (byVotes !== 0) return byVotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function listIdeas() {
  return readIdeas(await kvGet(IDEAS_KEY, []));
}
