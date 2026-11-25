import { kvGet, kvHashAll } from "@/lib/kv";

// Polls are a small ordered list, and the votes for each poll live in their own
// hash keyed by username, so one member's vote can be rewritten without ever
// reading everyone else's record into a request.

export const POLLS_KEY = "polls:list";
export const MAX_POLLS = 100;
export const MAX_OPTIONS = 8;
export const MAX_QUESTION = 160;
export const MAX_OPTION = 90;
export const MAX_BLURB = 280;

export const pollVotesKey = (pollId) => `poll:votes:${pollId}`;

function uid(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function cleanOptions(input) {
  const rows = Array.isArray(input) ? input : [];
  const seen = new Set();
  const options = [];
  for (const row of rows) {
    const label = String(typeof row === "string" ? row : row?.label ?? "").trim().slice(0, MAX_OPTION);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ id: String(row?.id || uid("o")).slice(0, 32), label });
    if (options.length >= MAX_OPTIONS) break;
  }
  return options;
}

export function normalizePoll(input = {}) {
  const created = new Date(input.createdAt || Date.now()).getTime();
  const closes = input.closesAt ? new Date(input.closesAt).getTime() : null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("p"),
    question: String(input.question ?? "").trim().slice(0, MAX_QUESTION),
    blurb: String(input.blurb ?? "").trim().slice(0, MAX_BLURB),
    options: cleanOptions(input.options),
    multiple: input.multiple === true,
    closed: input.closed === true,
    closesAt: closes && !Number.isNaN(closes) ? new Date(closes).toISOString() : null,
    createdAt: new Date(Number.isNaN(created) ? Date.now() : created).toISOString(),
    author: String(input.author || "Admin").slice(0, 60),
  };
}

export function readPolls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_POLLS)
    .map((entry) => normalizePoll(entry))
    .filter((entry) => entry.question && entry.options.length >= 2);
}

export function pollIsOpen(poll, now = Date.now()) {
  if (!poll || poll.closed) return false;
  if (!poll.closesAt) return true;
  const closes = new Date(poll.closesAt).getTime();
  if (Number.isNaN(closes)) return true;
  return now < closes;
}

// The admin panel and the public page must agree on whether a poll is taking
// votes, so both derive the state from this one clock rule instead of reading
// the stored `closed` flag directly.
export function pollWithStatus(poll, now = Date.now()) {
  return { ...poll, open: pollIsOpen(poll, now) };
}

function parseVote(row) {
  if (!row) return null;
  if (typeof row === "object") return row;
  try {
    return JSON.parse(row);
  } catch {
    return null;
  }
}

export function myChoices(rawVotes, username) {
  if (!username) return [];
  const vote = parseVote(rawVotes?.[username]);
  return Array.isArray(vote?.choices) ? vote.choices.map((id) => String(id)) : [];
}

// Every client sees the same numbers for the same poll: the tally is computed on
// the server from the stored votes, in the poll's own option order.
export function tallyPoll(poll, rawVotes) {
  const counts = new Map(poll.options.map((option) => [option.id, 0]));
  let total = 0;
  for (const [username, raw] of Object.entries(rawVotes || {})) {
    if (!username) continue;
    const vote = parseVote(raw);
    const choices = Array.isArray(vote?.choices) ? vote.choices : [];
    const valid = Array.from(new Set(choices.map((id) => String(id)))).filter((id) => counts.has(id));
    if (valid.length === 0) continue;
    total += 1;
    for (const id of valid) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const options = poll.options.map((option) => {
    const count = counts.get(option.id) || 0;
    return {
      ...option,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
  const leader = options.reduce((best, option) => (option.count > (best?.count ?? -1) ? option : best), null);
  return { total, options, leaderId: total > 0 && leader?.count > 0 ? leader.id : null };
}

export async function loadPollVotes(pollId) {
  return kvHashAll(pollVotesKey(pollId));
}

export async function listPolls() {
  return readPolls(await kvGet(POLLS_KEY, []));
}

export function pollSummary(poll, votes, username) {
  const tally = tallyPoll(poll, votes);
  return {
    ...poll,
    open: pollIsOpen(poll),
    tally,
    myChoices: myChoices(votes, username),
  };
}
