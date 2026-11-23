import { kvGet, kvDel, kvHashAll, kvHashSet, kvHashDel } from "@/lib/kv";

function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

const migrated = new Set();

export async function listRecords(legacyKey, recordsKey) {
  const records = await kvHashAll(recordsKey);
  if (Object.keys(records).length > 0 || migrated.has(legacyKey)) {
    return Object.values(records).sort(newestFirst);
  }

  const legacy = await kvGet(legacyKey, []);
  const entries = Array.isArray(legacy) ? legacy.filter((entry) => entry?.id) : [];
  migrated.add(legacyKey);
  if (entries.length === 0) return Object.values(records).sort(newestFirst);

  await kvHashSet(recordsKey, Object.fromEntries(entries.map((entry) => [entry.id, entry])));
  await kvDel(legacyKey);
  return entries.sort(newestFirst);
}

export async function saveRecord(recordsKey, record) {
  await kvHashSet(recordsKey, { [record.id]: record });
}

export async function deleteRecord(recordsKey, id) {
  await kvHashDel(recordsKey, id);
}

export async function clearRecords(recordsKey, legacyKey) {
  await kvDel(recordsKey);
  await kvDel(legacyKey);
}
