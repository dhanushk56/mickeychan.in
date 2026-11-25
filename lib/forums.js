import { kvGet, kvSet } from "@/lib/kv";

export const FORUMS_KEY = "forums:threads";
export const MAX_THREADS = 120;
export const MAX_REPLIES = 150;
export const MAX_TITLE = 120;
export const MAX_BODY = 4000;
export const MAX_REPLY = 2000;

// Two minutes between new threads and twenty seconds between replies keeps a
// single account from filling the board without getting in the way of a real
// conversation.
export const THREAD_GAP_MS = 2 * 60 * 1000;
export const REPLY_GAP_MS = 20 * 1000;

export const FORUM_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "videos", label: "Videos" },
  { id: "feedback", label: "Feedback" },
  { id: "off-topic", label: "Off topic" },
];

const CATEGORY_IDS = FORUM_CATEGORIES.map((entry) => entry.id);

export function categoryMeta(id) {
  return FORUM_CATEGORIES.find((entry) => entry.id === id) || FORUM_CATEGORIES[0];
}

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function uid(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function stamp(value) {
  const at = new Date(value || Date.now()).getTime();
  return new Date(Number.isNaN(at) ? Date.now() : at).toISOString();
}

function normalizeReply(input = {}) {
  const body = text(input.body, MAX_REPLY);
  if (!body) return null;
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("r"),
    body,
    author: text(input.author, 40),
    authorName: text(input.authorName, 60),
    createdAt: stamp(input.createdAt),
  };
}

export function normalizeThread(input = {}) {
  const replies = (Array.isArray(input.replies) ? input.replies : [])
    .map(normalizeReply)
    .filter(Boolean)
    .slice(0, MAX_REPLIES);
  return {
    id: typeof input.id === "string" && input.id ? input.id.slice(0, 40) : uid("t"),
    title: text(input.title, MAX_TITLE),
    body: text(input.body, MAX_BODY),
    category: CATEGORY_IDS.includes(input.category) ? input.category : "general",
    author: text(input.author, 40),
    authorName: text(input.authorName, 60),
    createdAt: stamp(input.createdAt),
    updatedAt: stamp(input.updatedAt || input.createdAt),
    pinned: input.pinned === true,
    locked: input.locked === true,
    replies,
  };
}

export function readThreads(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, MAX_THREADS)
    .map(normalizeThread)
    .filter((entry) => entry.title && entry.body);
}

export async function listThreads() {
  return readThreads(await kvGet(FORUMS_KEY, []));
}

async function persist(list) {
  await kvSet(FORUMS_KEY, list.slice(0, MAX_THREADS));
}

// Pinned threads float, then the ones with the newest reply. A thread with no
// replies is as new as the day it was posted.
export function sortThreads(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function lastReplyAt(thread) {
  const last = thread.replies[thread.replies.length - 1];
  return last?.createdAt || thread.createdAt;
}

export async function findThread(id) {
  const threads = await listThreads();
  return threads.find((thread) => thread.id === id) || null;
}

export async function createThread({ member, title, body, category }) {
  const cleanTitle = text(title, MAX_TITLE);
  const cleanBody = text(body, MAX_BODY);
  if (cleanTitle.length < 6) return { error: "Give the thread a clearer title." };
  if (cleanBody.length < 10) return { error: "Add a little more before posting." };

  const threads = await listThreads();
  const mine = threads
    .filter((thread) => thread.author.toLowerCase() === member.username.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (mine && Date.now() - new Date(mine.createdAt).getTime() < THREAD_GAP_MS) {
    return { error: "One new thread every couple of minutes. Give the last one a chance." };
  }

  const now = new Date().toISOString();
  const thread = normalizeThread({
    title: cleanTitle,
    body: cleanBody,
    category,
    author: member.username,
    authorName: member.name || member.username,
    createdAt: now,
    updatedAt: now,
  });
  await persist([thread, ...threads]);
  return { thread };
}

export async function addReply({ threadId, member, body }) {
  const clean = text(body, MAX_REPLY);
  if (clean.length < 2) return { error: "Write something first." };

  const threads = await listThreads();
  const thread = threads.find((entry) => entry.id === threadId);
  if (!thread) return { error: "That thread is gone." };
  if (thread.locked) return { error: "This thread is locked.", status: 409 };

  const last = thread.replies[thread.replies.length - 1];
  if (
    last &&
    last.author.toLowerCase() === member.username.toLowerCase() &&
    Date.now() - new Date(last.createdAt).getTime() < REPLY_GAP_MS
  ) {
    return { error: "One reply at a time. Give it a moment." };
  }

  const reply = normalizeReply({
    body: clean,
    author: member.username,
    authorName: member.name || member.username,
  });
  const updated = {
    ...thread,
    replies: [...thread.replies, reply].slice(-MAX_REPLIES),
    updatedAt: reply.createdAt,
  };
  await persist(threads.map((entry) => (entry.id === thread.id ? updated : entry)));
  return { reply, thread: updated };
}

export async function removeThread({ threadId, member, admin }) {
  const threads = await listThreads();
  const thread = threads.find((entry) => entry.id === threadId);
  if (!thread) return { status: 404, error: "That thread is already gone." };
  const owns = thread.author.toLowerCase() === String(member?.username || "").toLowerCase();
  if (!owns && !admin) return { status: 403, error: "That is not your thread." };
  await persist(threads.filter((entry) => entry.id !== threadId));
  return { ok: true };
}

export async function removeReply({ threadId, replyId, member, admin }) {
  const threads = await listThreads();
  const thread = threads.find((entry) => entry.id === threadId);
  if (!thread) return { status: 404, error: "That thread is already gone." };
  const reply = thread.replies.find((entry) => entry.id === replyId);
  if (!reply) return { status: 404, error: "That reply is already gone." };
  const owns = reply.author.toLowerCase() === String(member?.username || "").toLowerCase();
  if (!owns && !admin) return { status: 403, error: "That is not your reply." };

  const updated = {
    ...thread,
    replies: thread.replies.filter((entry) => entry.id !== replyId),
  };
  await persist(threads.map((entry) => (entry.id === thread.id ? updated : entry)));
  return { ok: true };
}

export async function setThreadFlags({ threadId, admin, pinned, locked }) {
  if (!admin) return { status: 403, error: "Only moderators can do that." };
  const threads = await listThreads();
  const thread = threads.find((entry) => entry.id === threadId);
  if (!thread) return { status: 404, error: "That thread is gone." };
  const updated = { ...thread };
  if (typeof pinned === "boolean") updated.pinned = pinned;
  if (typeof locked === "boolean") updated.locked = locked;
  await persist(threads.map((entry) => (entry.id === thread.id ? updated : entry)));
  return { thread: updated };
}
