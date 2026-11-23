import { kvGet, kvSet, kvDel, kvHashAll, kvHashSet, kvHashDel } from "@/lib/kv";

export const JOIN_MESSAGES_KEY = "submissions:join";

export function joinMessagesRecordsKey() {
  return `${JOIN_MESSAGES_KEY}:records`;
}

function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

export async function listJoinMessages() {
  const key = joinMessagesRecordsKey();
  const records = await kvHashAll(key);
  const legacy = await kvGet(JOIN_MESSAGES_KEY, []);
  const legacyList = Array.isArray(legacy) ? legacy.filter((entry) => entry?.id) : [];
  if (legacyList.length > 0) {
    const missing = legacyList.filter((entry) => !records[entry.id]);
    await Promise.all(missing.map((entry) => kvHashSet(key, entry.id, entry)));
    for (const entry of missing) records[entry.id] = entry;
    if (legacyList.every((entry) => records[entry.id])) await kvDel(JOIN_MESSAGES_KEY);
  }
  return Object.values(records).filter(Boolean).sort(newestFirst);
}

export async function addJoinMessage(message) {
  await kvHashSet(joinMessagesRecordsKey(), message.id, message);
  return message;
}

export async function deleteJoinMessage(id) {
  await kvHashDel(joinMessagesRecordsKey(), id);
  const legacy = await kvGet(JOIN_MESSAGES_KEY, []);
  if (Array.isArray(legacy) && legacy.some((entry) => entry?.id === id)) {
    await kvSet(JOIN_MESSAGES_KEY, legacy.filter((entry) => entry?.id !== id));
  }
}
