import { kvDel, kvGet, kvHashAll, kvHashDel, kvHashSet, kvSet } from "@/lib/kv";

// One library per member: watch later, playlists, history and the switches that
// control them. Every key is scoped by username so one member can never read
// another's list, and the shapes stay additive so older records keep working.

const watchKey = (username) => `library:watch:${username}`;
const playlistsKey = (username) => `library:playlists:${username}`;
const playlistKey = (id) => `library:playlist:${id}`;
const historyKey = (username) => `library:history:${username}`;
const settingsKey = (username) => `library:settings:${username}`;

export const WATCH_LATER_MAX = 500;
export const PLAYLIST_MAX = 30;
export const PLAYLIST_ITEMS_MAX = 200;
export const HISTORY_STORE_CAP = 240;
export const DEFAULT_HISTORY_CAP = 60;
const NAME_MAX = 60;

function cleanName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

function cleanId(value) {
  return String(value ?? "").trim().slice(0, 64);
}

function newestFirst(a, b) {
  return new Date(b.at || 0) - new Date(a.at || 0);
}

// --- Settings ---------------------------------------------------------------

export function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const cap = Number(source.historyCap);
  return {
    historyOn: source.historyOn !== false,
    publicPlaylists: source.publicPlaylists === true,
    historyCap: Number.isFinite(cap)
      ? Math.min(300, Math.max(10, Math.round(cap)))
      : DEFAULT_HISTORY_CAP,
  };
}

export async function readSettings(username) {
  return normalizeSettings(await kvGet(settingsKey(username), null));
}

export async function saveSettings(username, patch = {}) {
  const current = await readSettings(username);
  const next = normalizeSettings({ ...current, ...(patch || {}) });
  await kvSet(settingsKey(username), next);
  return next;
}

// --- Watch later ------------------------------------------------------------

export async function listWatchLater(username) {
  const all = await kvHashAll(watchKey(username));
  return Object.values(all)
    .filter((entry) => entry && entry.id)
    .map((entry) => ({ id: String(entry.id), at: entry.at || null }))
    .sort(newestFirst);
}

export async function toggleWatchLater(username, videoId, save) {
  const id = cleanId(videoId);
  if (!id) return { error: "Pick a video first." };
  const key = watchKey(username);
  const all = await kvHashAll(key);
  const exists = Boolean(all?.[id]);
  const wanted = typeof save === "boolean" ? save : !exists;

  if (wanted && !exists) {
    if (Object.keys(all).length >= WATCH_LATER_MAX) {
      return { error: `Your watch later list holds ${WATCH_LATER_MAX} videos.` };
    }
    await kvHashSet(key, { [id]: { id, at: new Date().toISOString() } });
  } else if (!wanted && exists) {
    await kvHashDel(key, id);
  }
  return { saved: wanted };
}

// --- Playlists --------------------------------------------------------------

function playlistSummary(doc) {
  return {
    id: doc.id,
    name: doc.name,
    public: doc.public === true,
    count: Array.isArray(doc.items) ? doc.items.length : 0,
    updatedAt: doc.updatedAt || doc.createdAt || null,
  };
}

async function readPlaylistDoc(id) {
  const doc = await kvGet(playlistKey(id), null);
  return doc && doc.id && Array.isArray(doc.items) ? doc : null;
}

export async function listPlaylists(username) {
  const all = await kvHashAll(playlistsKey(username));
  return Object.values(all)
    .filter((entry) => entry && entry.id)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export async function getPlaylist(username, id) {
  const doc = await readPlaylistDoc(cleanId(id));
  if (!doc || doc.owner !== username) return null;
  return doc;
}

async function writePlaylist(doc) {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  await kvSet(playlistKey(next.id), next);
  await kvHashSet(playlistsKey(next.owner), { [next.id]: playlistSummary(next) });
  return next;
}

export async function createPlaylist(username, name) {
  const clean = cleanName(name);
  if (!clean) return { error: "Give the playlist a name." };
  const existing = await listPlaylists(username);
  if (existing.length >= PLAYLIST_MAX) {
    return { error: `You can keep ${PLAYLIST_MAX} playlists.` };
  }
  const stamp = new Date().toISOString();
  const id = `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const doc = {
    id,
    owner: username,
    name: clean,
    public: false,
    items: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  await kvSet(playlistKey(id), doc);
  await kvHashSet(playlistsKey(username), { [id]: playlistSummary(doc) });
  return { playlist: doc };
}

export async function updatePlaylist(username, id, patch = {}) {
  const doc = await getPlaylist(username, id);
  if (!doc) return { error: "That playlist is gone." };
  if (patch.name !== undefined) {
    const clean = cleanName(patch.name);
    if (!clean) return { error: "Give the playlist a name." };
    doc.name = clean;
  }
  if (typeof patch.public === "boolean") doc.public = patch.public;
  return { playlist: await writePlaylist(doc) };
}

export async function deletePlaylist(username, id) {
  const doc = await getPlaylist(username, id);
  if (!doc) return { error: "That playlist is gone." };
  await kvDel(playlistKey(doc.id));
  await kvHashDel(playlistsKey(username), doc.id);
  return { ok: true };
}

export async function setPlaylistItem(username, id, videoId, present) {
  const doc = await getPlaylist(username, id);
  if (!doc) return { error: "That playlist is gone." };
  const vid = cleanId(videoId);
  if (!vid) return { error: "Pick a video first." };
  const items = doc.items.filter((entry) => entry !== vid);
  if (present) {
    if (items.length >= PLAYLIST_ITEMS_MAX) {
      return { error: `A playlist holds ${PLAYLIST_ITEMS_MAX} videos.` };
    }
    items.unshift(vid);
  }
  doc.items = items;
  return { playlist: await writePlaylist(doc) };
}

// --- History ----------------------------------------------------------------

export async function listHistory(username) {
  const all = await kvHashAll(historyKey(username));
  return Object.values(all)
    .filter((entry) => entry && entry.id)
    .map((entry) => ({ id: String(entry.id), at: entry.at || null }))
    .sort(newestFirst);
}

export async function recordHistory(username, videoId) {
  const id = cleanId(videoId);
  if (!id) return { recorded: false };
  const settings = await readSettings(username);
  if (!settings.historyOn) return { recorded: false, reason: "off" };

  const key = historyKey(username);
  const all = await kvHashAll(key);
  const day = new Date().toISOString().slice(0, 10);
  const watchedToday = Object.values(all).filter(
    (entry) => entry && String(entry.at || "").slice(0, 10) === day
  ).length;
  if (watchedToday >= settings.historyCap) return { recorded: false, reason: "cap" };

  await kvHashSet(key, { [id]: { id, at: new Date().toISOString() } });

  const older = Object.values(all)
    .filter((entry) => entry && entry.id && entry.id !== id)
    .sort(newestFirst);
  for (const stale of older.slice(HISTORY_STORE_CAP - 1)) {
    await kvHashDel(key, stale.id);
  }
  return { recorded: true };
}

export async function clearHistory(username) {
  await kvDel(historyKey(username));
  return { ok: true };
}

// --- Everything at once -----------------------------------------------------

export async function readLibrary(username) {
  const [settings, watchLater, summaries, history] = await Promise.all([
    readSettings(username),
    listWatchLater(username),
    listPlaylists(username),
    listHistory(username),
  ]);
  // Playlists come back with their items so the dashboard and a public profile
  // can render a playlist without a second round trip per card.
  const playlists = (
    await Promise.all(
      summaries.map(async (summary) => {
        const doc = await readPlaylistDoc(summary.id);
        return doc && doc.owner === username ? { ...summary, items: doc.items } : null;
      })
    )
  ).filter(Boolean);
  return { settings, watchLater, playlists, history };
}

// Videos referenced by a library, for the dashboard and public playlists.
export function referencedVideoIds(library) {
  const ids = new Set();
  for (const entry of library?.watchLater || []) if (entry?.id) ids.add(entry.id);
  for (const entry of library?.history || []) if (entry?.id) ids.add(entry.id);
  for (const entry of library?.playlists || []) {
    for (const videoId of entry?.items || []) if (videoId) ids.add(videoId);
  }
  return [...ids];
}

