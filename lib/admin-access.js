export const ADMIN_USERNAMES = ["mickey", "Ashhcc", "Ayano", "dsk13426"];

export function normalizeAdminName(value) {
  return String(value || "").trim().toLowerCase();
}

export function isAdminUsername(value) {
  const name = normalizeAdminName(value);
  if (!name) return false;
  return ADMIN_USERNAMES.some((entry) => normalizeAdminName(entry) === name);
}

export function adminUsernames() {
  return ADMIN_USERNAMES.map((entry) => String(entry));
}
