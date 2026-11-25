import { kvGet, kvSet } from "@/lib/kv";
import { getSessionFromCookies, verifySessionTokenValue } from "@/lib/auth";
import { can, resolveAdmin } from "@/lib/roles";

export const MAINTENANCE_KEY = "site:maintenance";
export const MAINTENANCE_PERMISSION = "site.maintenance";
export const BYPASS_PERMISSION = "site.bypass-maintenance";
export const MAX_MESSAGE = 400;

export const DEFAULT_MESSAGE =
  "The site is closed while I make a few changes. It will be back as soon as they are done.";

// The console and the ways back in stay open, so staff can sign in and turn the
// site back on. Everything else is closed.
const OPEN_PATHS = ["/admin", "/login", "/verify", "/forgot-password", "/maintenance"];

export function readMaintenance(raw) {
  const message = String(raw?.message ?? "")
    .trim()
    .slice(0, MAX_MESSAGE);
  return {
    enabled: raw?.enabled === true,
    message: message || DEFAULT_MESSAGE,
    updatedAt: Number(raw?.updatedAt) || null,
    updatedBy: String(raw?.updatedBy ?? "").slice(0, 40) || null,
  };
}

export async function getMaintenance() {
  return readMaintenance(await kvGet(MAINTENANCE_KEY, null));
}

export async function saveMaintenance(input = {}, username = "") {
  const next = readMaintenance({
    enabled: input.enabled === true,
    message: input.message,
    updatedAt: Date.now(),
    updatedBy: username,
  });
  await kvSet(MAINTENANCE_KEY, next);
  return next;
}

export function canBypass(access) {
  return can(access, BYPASS_PERMISSION);
}

export function isOpenPath(pathname) {
  const path = String(pathname || "");
  return OPEN_PATHS.some((entry) => path === entry || path.startsWith(`${entry}/`));
}

// One call per request from the layout. A closed site still lets the console and
// the sign in pages through, so the person running it is never locked out. The
// maintenance URL itself always renders the closed page, even for staff.
export async function maintenanceStatus(pathname) {
  const state = await getMaintenance();
  if (!state.enabled) {
    return { ...state, closed: false, bypass: false, locked: false };
  }
  const session = await getSessionFromCookies();
  const access = session ? await resolveAdmin(session.user.username) : null;
  const bypass = canBypass(access);
  if (pathname === "/maintenance") {
    return { ...state, closed: true, bypass, locked: !bypass };
  }
  if (isOpenPath(pathname)) {
    return { ...state, closed: false, bypass, locked: !bypass };
  }
  return { ...state, closed: !bypass, bypass, locked: !bypass };
}

// Used by the proxy, which sees the request cookie rather than the cookie jar.
export async function sessionCanBypass(token) {
  if (!token) return false;
  const session = verifySessionTokenValue(token);
  if (!session) return false;
  const access = await resolveAdmin(session.user.username);
  return canBypass(access);
}

// Public submissions close with the site. Staff with the bypass permission can
// still fill in forms while they work on it.
export async function submissionsClosed() {
  const state = await getMaintenance();
  if (!state.enabled) return false;
  const session = await getSessionFromCookies();
  if (!session) return true;
  const access = await resolveAdmin(session.user.username);
  return !canBypass(access);
}

export const CLOSED_ERROR = "The site is closed for maintenance right now. Try again later.";
