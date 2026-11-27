import { kvDel, kvGet, kvSet } from "@/lib/kv";

// The public profile switch is stored in the record the old library settings used,
// so a member who already published their profile stays published.

const settingsKey = (username) => `library:settings:${username}`;

export function normalizeProfileSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return { profileVisible: source.profileVisible === true };
}

export async function readProfileSettings(username) {
  return normalizeProfileSettings(await kvGet(settingsKey(username), null));
}

export async function deleteProfileSettings(username) {
  await kvDel(settingsKey(username));
}

export async function saveProfileSettings(username, patch = {}) {
  const current = await readProfileSettings(username);
  const next = normalizeProfileSettings({ ...current, ...(patch || {}) });
  await kvSet(settingsKey(username), next);
  return next;
}
