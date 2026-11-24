import { kvGet, kvSet } from "@/lib/kv";

const KEY = "members:form-blacklist";
const MAX_REASON = 300;

function normalize(username) {
  return String(username || "").trim().toLowerCase();
}

export async function readBlacklist() {
  const stored = await kvGet(KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((entry) => entry && typeof entry.username === "string" && entry.username.trim());
}

export async function blacklistEntry(username) {
  const handle = normalize(username);
  if (!handle) return null;
  const list = await readBlacklist();
  return list.find((entry) => normalize(entry.username) === handle) || null;
}

export async function addToBlacklist({ username, reason = "", addedBy = "Admin" }) {
  const handle = normalize(username);
  if (!handle) return { error: "Pick an account first." };

  const list = await readBlacklist();
  const existing = list.find((entry) => normalize(entry.username) === handle);
  const entry = {
    username: existing?.username || String(username).trim(),
    reason: String(reason || "").trim().slice(0, MAX_REASON),
    addedBy: String(addedBy || "Admin").trim().slice(0, 60) || "Admin",
    addedAt: existing?.addedAt || new Date().toISOString(),
  };

  const next = existing
    ? list.map((item) => (normalize(item.username) === handle ? entry : item))
    : [...list, entry];
  await kvSet(KEY, next);
  return { entry };
}

export async function removeFromBlacklist(username) {
  const handle = normalize(username);
  if (!handle) return { error: "Pick an account first." };
  const list = await readBlacklist();
  const next = list.filter((entry) => normalize(entry.username) !== handle);
  if (next.length === list.length) return { error: "That account isn't blocked from forms." };
  await kvSet(KEY, next);
  return { ok: true };
}

export async function annotateBlacklist(accounts) {
  const list = await readBlacklist();
  if (list.length === 0) {
    return (accounts || []).map((account) => ({ ...account, formBlocked: false }));
  }
  const blocked = new Map(list.map((entry) => [normalize(entry.username), entry]));
  return (accounts || []).map((account) => {
    const entry = blocked.get(normalize(account.username));
    return {
      ...account,
      formBlocked: Boolean(entry),
      blacklistReason: entry?.reason || "",
      blacklistedAt: entry?.addedAt || null,
    };
  });
}
