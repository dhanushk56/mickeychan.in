import { kvGet, kvDel, kvHashAll, kvHashSet, kvHashSetOnce, kvHashDel } from "@/lib/kv";

function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

const migrated = new Set();

async function importLegacy(legacyKey, recordsKey, toFields) {
  if (migrated.has(legacyKey)) return {};
  migrated.add(legacyKey);
  const fields = toFields(await kvGet(legacyKey, null));
  if (Object.keys(fields).length === 0) return {};
  await kvHashSet(recordsKey, fields);
  await kvDel(legacyKey);
  return fields;
}

export async function listRecords(legacyKey, recordsKey, fieldOf = (entry) => entry?.id) {
  const records = await kvHashAll(recordsKey);
  if (Object.keys(records).length > 0 || migrated.has(legacyKey)) {
    return Object.values(records).sort(newestFirst);
  }
  const fields = await importLegacy(legacyKey, recordsKey, (legacy) =>
    Object.fromEntries(
      (Array.isArray(legacy) ? legacy : [])
        .map((entry) => [fieldOf(entry), entry])
        .filter(([field]) => Boolean(field))
    )
  );
  return Object.values({ ...records, ...fields }).sort(newestFirst);
}

export async function readRecordsMap(legacyKey, recordsKey) {
  const records = await kvHashAll(recordsKey);
  if (Object.keys(records).length > 0 || migrated.has(legacyKey)) return records;
  const fields = await importLegacy(legacyKey, recordsKey, (legacy) =>
    legacy && typeof legacy === "object" && !Array.isArray(legacy) ? legacy : {}
  );
  return { ...records, ...fields };
}

export async function saveRecord(recordsKey, field, record) {
  if (!field) return;
  await kvHashSet(recordsKey, { [field]: record });
}

export async function createRecord(recordsKey, field, record) {
  if (!field) return false;
  return kvHashSetOnce(recordsKey, field, record);
}

export async function deleteRecord(recordsKey, field) {
  if (!field) return;
  await kvHashDel(recordsKey, field);
}

export async function clearRecords(recordsKey, legacyKey) {
  await kvDel(recordsKey);
  await kvDel(legacyKey);
}
