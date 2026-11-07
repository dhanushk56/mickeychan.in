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
    const { kv } = await import("@vercel/kv");
    kvClient = kv;
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

export function isKvConfigured() {
  return hasKv;
}
