import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")

def patch(path, old, new):
    p = root / path
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected 1 match, found {count} for:\n{old[:120]}")
    p.write_text(text.replace(old, new))
    print(f"  patched {path}")

patch(
    "lib/kv.js",
    """export async function kvHashDel(key, field) {""",
    """export async function kvHashSetOnce(key, field, value) {
  const client = await getClient();
  if (!client) {
    const existing = memoryStore.get(key);
    const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    if (Object.prototype.hasOwnProperty.call(base, field)) return false;
    memoryStore.set(key, { ...base, [field]: value });
    return true;
  }
  const added = await client.hsetnx(key, field, value);
  return Number(added) === 1;
}

export async function kvHashDel(key, field) {""",
)

patch(
    "lib/record-store.js",
    'import { kvGet, kvDel, kvHashAll, kvHashSet, kvHashDel } from "@/lib/kv";',
    'import { kvGet, kvDel, kvHashAll, kvHashSet, kvHashSetOnce, kvHashDel } from "@/lib/kv";',
)
patch(
    "lib/record-store.js",
    """export async function deleteRecord(recordsKey, field) {""",
    """export async function createRecord(recordsKey, field, record) {
  if (!field) return false;
  return kvHashSetOnce(recordsKey, field, record);
}

export async function deleteRecord(recordsKey, field) {""",
)

patch(
    "lib/members.js",
    'import { deleteRecord, listRecords, readRecordsMap, saveRecord } from "@/lib/record-store";',
    'import { createRecord, deleteRecord, listRecords, readRecordsMap, saveRecord } from "@/lib/record-store";',
)

patch(
    "lib/members.js",
    """async function allMembers() {
  const [registered, overrides, deleted] = await Promise.all([
    registeredMembers(),
    passwordOverrides(),
    deletedUsernames(),
  ]);
  const seed = seedMembers()
    .filter((user) => !deleted.some((entry) => matchesDeletion(entry, user)))
    .map((user) => {
      const override = overrides[normalize(user.username)] || {};
      return {
        ...user,
        ...override,
        source: "file",
      };
    });

  return [...seed, ...registered.map((user) => ({ ...user, source: "registered" }))];
}""",
    """function dedupeSeed(users) {
  const handles = new Set();
  const emails = new Set();
  const kept = [];
  const dropped = [];

  for (const user of users) {
    const handle = normalize(user.username);
    const email = normalizeEmail(user.email);
    if (!handle || handles.has(handle) || (email && emails.has(email))) {
      dropped.push(String(user.username || "(no username)"));
      continue;
    }
    handles.add(handle);
    if (email) emails.add(email);
    kept.push(user);
  }

  if (dropped.length > 0) {
    console.warn(
      `[members] data/users.json has duplicate accounts (${dropped.join(", ")}) — later copies are ignored.`
    );
  }

  return kept;
}

async function allMembers() {
  const [registered, overrides, deleted] = await Promise.all([
    registeredMembers(),
    passwordOverrides(),
    deletedUsernames(),
  ]);
  const seed = dedupeSeed(
    seedMembers().filter((user) => !deleted.some((entry) => matchesDeletion(entry, user)))
  ).map((user) => {
    const override = overrides[normalize(user.username)] || {};
    return {
      ...user,
      ...override,
      source: "file",
    };
  });

  const registeredHandles = new Set(registered.map((user) => normalize(user.username)));
  const clashes = seed
    .filter((user) => registeredHandles.has(normalize(user.username)))
    .map((user) => user.username);
  if (clashes.length > 0) {
    console.warn(
      `[members] ${clashes.join(", ")} exist in both data/users.json and the account store — the data/users.json entry wins.`
    );
  }

  return [...seed, ...registered.map((user) => ({ ...user, source: "registered" }))];
}""",
)

patch(
    "lib/members.js",
    """  await saveRecord(REGISTERED_RECORDS_KEY, handle, member);

  return { member };""",
    """  const created = await createRecord(REGISTERED_RECORDS_KEY, handle, member);
  if (!created) {
    return { error: "That username is already taken.", code: "username_taken" };
  }

  return { member };""",
)

patch(
    "lib/members.js",
    """  if (member.source === "registered") {
    if (newHandle !== oldHandle) await deleteRecord(REGISTERED_RECORDS_KEY, oldHandle);
    await saveRecord(REGISTERED_RECORDS_KEY, newHandle, { ...withoutSource(member), ...clean });
  } else {""",
    """  if (member.source === "registered") {
    const record = { ...withoutSource(member), ...clean };
    if (newHandle !== oldHandle) {
      const created = await createRecord(REGISTERED_RECORDS_KEY, newHandle, record);
      if (!created) return { error: "That username is already taken." };
      await deleteRecord(REGISTERED_RECORDS_KEY, oldHandle);
    } else {
      await saveRecord(REGISTERED_RECORDS_KEY, newHandle, record);
    }
  } else {""",
)

patch(
    "lib/members.js",
    """  return { ...member, ...clean };
}

export async function updateMemberAccount(username, patch = {}) {""",
    """  return { saved: { ...member, ...clean } };
}

export async function updateMemberAccount(username, patch = {}) {""",
)

patch(
    "lib/members.js",
    """  const saved = await saveMemberRecord(member, { ...changes, updatedAt }, nextUsername);
  return { member: saved, renamed: Boolean(nextUsername) };""",
    """  const write = await saveMemberRecord(member, { ...changes, updatedAt }, nextUsername);
  if (write.error) return { error: write.error };
  return { member: write.saved, renamed: Boolean(nextUsername) };""",
)

patch(
    "lib/members.js",
    """  const saved = await saveMemberRecord(member, changes, nextUsername);
  if (nextUsername) await moveAdminAccess(member.username, nextUsername);
  return { member: saved, renamed: Boolean(nextUsername) };""",
    """  const write = await saveMemberRecord(member, changes, nextUsername);
  if (write.error) return { error: write.error };
  if (nextUsername) await moveAdminAccess(member.username, nextUsername);
  return { member: write.saved, renamed: Boolean(nextUsername) };""",
)

print("done")
