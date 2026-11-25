import { kvGet, kvPush, kvRange, kvSet } from "@/lib/kv";

// Notifications are a small list per member. Unread state lives beside it as an
// array of ids so the badge is one read, and a notification can be re-shown if
// its id is ever removed from that array.

const listKey = (username) => `notifications:${username}`;
const readKey = (username) => `notifications:${username}:read`;
const MAX_STORED = 60;
const MAX_READ = 200;

export const NOTIFICATION_KINDS = ["application", "message", "event", "account"];

function cleanUser(value) {
  return String(value || "").trim().slice(0, 40);
}

export async function addNotification(username, { kind = "account", title = "", body = "", href = "" } = {}) {
  const user = cleanUser(username);
  if (!user) return null;
  const entry = {
    id: `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind: NOTIFICATION_KINDS.includes(kind) ? kind : "account",
    title: String(title).slice(0, 120),
    body: String(body).slice(0, 300),
    href: String(href || "").slice(0, 200),
    at: new Date().toISOString(),
  };
  await kvPush(listKey(user), JSON.stringify(entry), MAX_STORED);
  return entry;
}

export async function listNotifications(username) {
  const user = cleanUser(username);
  if (!user) return [];
  const [rows, read] = await Promise.all([kvRange(listKey(user), 0, -1), kvGet(readKey(user), [])]);
  const readIds = new Set(Array.isArray(read) ? read : []);
  return rows
    .map((row) => {
      try {
        const entry = typeof row === "string" ? JSON.parse(row) : row;
        if (!entry || !entry.id) return null;
        return {
          id: String(entry.id),
          kind: String(entry.kind || "account"),
          title: String(entry.title || ""),
          body: String(entry.body || ""),
          href: String(entry.href || ""),
          at: entry.at || null,
          read: readIds.has(String(entry.id)),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function unreadNotificationCount(username) {
  const list = await listNotifications(username);
  return list.filter((entry) => !entry.read).length;
}

export async function markNotificationsRead(username, ids) {
  const user = cleanUser(username);
  if (!user) return [];
  const list = await listNotifications(user);
  const wanted = Array.isArray(ids) && ids.length
    ? ids.map((id) => String(id)).filter(Boolean)
    : list.map((entry) => entry.id);
  const read = await kvGet(readKey(user), []);
  const next = Array.from(new Set([...(Array.isArray(read) ? read : []), ...wanted])).slice(-MAX_READ);
  await kvSet(readKey(user), next);
  return next;
}
