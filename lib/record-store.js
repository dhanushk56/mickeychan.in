import { kvGet, kvDel, kvHashAll, kvHashSet, kvHashSetOnce, kvHashDel } from "@/lib/kv";

function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

// Records written before the move to per-record hashes live in one plain value.
// They are read on every call, not only while the hash is empty: an account made
// after that move would otherwise hide every older account from lookups, which
// is how Google and Discord members stopped blocking duplicate sign-ups.
async function legacyFields(legacyKey, toFields) {
  const legacy = await kvGet(legacyKey, null);
  if (legacy === null || legacy === undefined) return {};
  return toFields(legacy);
}

// Copies anything the hash is missing, then drops the old value, so edits and
// deletions land in the one store that reads and writes now use. The hash copy
// wins when a record exists in both places.
async function absorbLegacy(legacyKey, recordsKey, fields, records) {
  if (Object.keys(fields).length === 0) return records;
  const missing = Object.fromEntries(
    Object.entries(fields).filter(([field]) => !(field in records))
  );
  if (Object.keys(missing).length > 0) await kvHashSet(recordsKey, missing);
  await kvDel(legacyKey);
  return { ...fields, ...records };
}

export async function listRecords(legacyKey, recordsKey, fieldOf = (entry) => entry?.id) {
  const [records, fields] = await Promise.all([
    kvHashAll(recordsKey),
    legacyFields(legacyKey, (legacy) =>
      Object.fromEntries(
        (Array.isArray(legacy) ? legacy : [])
          .map((entry) => [fieldOf(entry), entry])
          .filter(([field]) => Boolean(field))
      )
    ),
  ]);

  const merged = await absorbLegacy(legacyKey, recordsKey, fields, records);
  return Object.values(merged).sort(newestFirst);
}

export async function readRecordsMap(legacyKey, recordsKey) {
  const [records, fields] = await Promise.all([
    kvHashAll(recordsKey),
    legacyFields(legacyKey, (legacy) =>
      legacy && typeof legacy === "object" && !Array.isArray(legacy) ? legacy : {}
    ),
  ]);

  return absorbLegacy(legacyKey, recordsKey, fields, records);
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
