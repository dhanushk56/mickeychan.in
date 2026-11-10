
const memoryStore =
  globalThis.__mickeyChanMemoryKv ||
  (globalThis.__mickeyChanMemoryKv = new Map());

const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kvClient = null;
async function getClient() {
  if (!hasKv) return null;
  if (!kvClient) {
    const { createClient } = await import("@vercel/kv");
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
