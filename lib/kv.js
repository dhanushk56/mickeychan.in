// Thin wrapper around Vercel KV. Falls back to an in-memory Map when
// KV_REST_API_URL / KV_REST_API_TOKEN aren't set (e.g. local dev before
// you've linked a KV store) so the app doesn't crash — it just won't
// persist across restarts in that case. In production on Vercel, link a
// KV store to the project (Storage tab -> Create Database -> KV) and
// these env vars are injected automatically.
//
// The fallback lives on globalThis so every bundle/instance in the dev
// server (server components, route handlers, hot reload) shares one map.

const memoryStore =
  globalThis.__mickeyChanMemoryKv ||
  (globalThis.__mickeyChanMemoryKv = new Map());

const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kvClient = null;
async function getClient() {
  if (!hasKv) return null;
  if (!kvClient) {
    const { createClient } = await import("@vercel/kv");
    // Redis reads must never be served from Next's fetch cache. The client's
    // internal HTTP call is a GET, which Next caches by default in page
    // renders — that made /positions keep showing a build-time snapshot of an
    // empty form index even after a form was saved and published.
    kvClient = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
  }
  return kvClient;
}

export async function kvGet(key, fallback) {
  const client = await getClient();
  if (!client) {
    return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  }
  const value = await client.get(key);
  return value === null || value === undefined ? fallback : value;
}

export async function kvSet(key, value) {
  const client = await getClient();
  if (!client) {
    memoryStore.set(key, value);
    return;
  }
  await client.set(key, value);
}

export async function kvDel(key) {
  const client = await getClient();
  if (!client) {
    memoryStore.delete(key);
    return;
  }
  await client.del(key);
}

// Append to a list, newest first, keeping only the most recent `max` items.
// Used by the activity log: one cheap write per event instead of a
// read-modify-write of a whole array, so two instances logging at once can't
// drop each other's entries.
export async function kvPush(key, value, max = 1000) {
  const client = await getClient();
  if (!client) {
    const existing = memoryStore.get(key);
    const next = [value, ...(Array.isArray(existing) ? existing : [])].slice(0, max);
    memoryStore.set(key, next);
    return;
  }
  await client.lpush(key, value);
  await client.ltrim(key, 0, max - 1);
}

// Read a slice of that list, newest first. `stop` is inclusive, like lrange.
export async function kvRange(key, start = 0, stop = -1) {
  const client = await getClient();
  if (!client) {
    const existing = memoryStore.get(key);
    const list = Array.isArray(existing) ? existing : [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }
  const values = await client.lrange(key, start, stop);
  return Array.isArray(values) ? values : [];
}

export function isKvConfigured() {
  return hasKv;
}
