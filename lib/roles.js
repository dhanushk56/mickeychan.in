import { kvGet, kvSet } from "@/lib/kv";

export const SUPER_OWNER = "dsk13426";
export const OWNER_ROLE_ID = "owner";

const ROLES_KEY = "roles:list";
const GRANTS_KEY = "roles:grants";

export const OWNER_ONLY_PERMISSIONS = ["roles.view", "roles.manage", "admins.manage"];

export const PERMISSION_GROUPS = [
  {
    id: "console",
    label: "Console",
    permissions: [
      { id: "console.view", label: "Open the admin console" },
      { id: "audit.view", label: "Read the audit log" },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    permissions: [
      { id: "applications.view", label: "See applications" },
      { id: "applications.review", label: "Accept, reject or reopen applications" },
      { id: "applications.delete", label: "Delete a single application" },
      { id: "applications.clear", label: "Delete every application at once" },
    ],
  },
  {
    id: "messages",
    label: "Messages",
    permissions: [
      { id: "messages.view", label: "Read join us messages" },
      { id: "messages.delete", label: "Delete a message" },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    permissions: [
      { id: "forms.view", label: "See forms" },
      { id: "forms.create", label: "Create a form" },
      { id: "forms.edit", label: "Edit a form and publish it" },
      { id: "forms.delete", label: "Delete a form" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    permissions: [
      { id: "accounts.view", label: "See accounts" },
      { id: "accounts.create", label: "Create an account" },
      { id: "accounts.password", label: "Set a member password" },
      { id: "accounts.delete", label: "Delete an account" },
      { id: "accounts.block", label: "Block or unblock form submissions" },
    ],
  },
  {
    id: "announcements",
    label: "Announcements",
    permissions: [
      { id: "announcements.view", label: "See announcements" },
      { id: "announcements.create", label: "Post an announcement" },
      { id: "announcements.delete", label: "Delete an announcement" },
    ],
  },
  {
    id: "content",
    label: "Site content",
    permissions: [
      { id: "content.view", label: "See site content" },
      { id: "content.edit", label: "Change videos and the join form" },
    ],
  },
  {
    id: "admins",
    label: "Admin access",
    permissions: [
      { id: "admins.view", label: "See who has console access" },
      { id: "admins.manage", label: "Grant or remove console access" },
    ],
  },
  {
    id: "roles",
    label: "Roles",
    permissions: [
      { id: "roles.view", label: "See roles" },
      { id: "roles.manage", label: "Create, edit and delete roles" },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);

export const DEFAULT_ROLES = [
  {
    id: OWNER_ROLE_ID,
    name: "Super owner",
    description: "The account that owns the console. Full access, always, with nothing to configure.",
    permissions: ["*"],
    locked: true,
  },
  {
    id: "administrator",
    name: "Administrator",
    description: "Runs the console day to day, without touching roles or granting access.",
    permissions: ALL_PERMISSIONS.filter((permission) => !OWNER_ONLY_PERMISSIONS.includes(permission)),
    locked: false,
  },
  {
    id: "moderator",
    name: "Moderator",
    description: "Reviews applications and messages and can block accounts from forms.",
    permissions: [
      "console.view",
      "audit.view",
      "applications.view",
      "applications.review",
      "applications.delete",
      "messages.view",
      "messages.delete",
      "accounts.view",
      "accounts.block",
      "forms.view",
      "announcements.view",
      "content.view",
      "admins.view",
    ],
    locked: false,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Reads submissions and accepts or rejects them. Nothing destructive.",
    permissions: [
      "console.view",
      "audit.view",
      "applications.view",
      "applications.review",
      "messages.view",
      "announcements.view",
      "admins.view",
    ],
    locked: false,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Look-only access to everything except roles.",
    permissions: [
      "console.view",
      "audit.view",
      "applications.view",
      "messages.view",
      "forms.view",
      "accounts.view",
      "announcements.view",
      "content.view",
    ],
    locked: false,
  },
];

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function isSuperOwner(value) {
  const name = normalizeUsername(value);
  return Boolean(name) && name === SUPER_OWNER;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanPermissions(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter((entry) => ALL_PERMISSIONS.includes(entry))));
}

export function normalizeRole(input, index = 0) {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name || "")
    .trim()
    .slice(0, 48);
  if (!name) return null;
  const id = slugify(input.id || name) || `role-${index + 1}`;
  if (id === OWNER_ROLE_ID) {
    return clone(DEFAULT_ROLES[0]);
  }
  return {
    id,
    name,
    description: String(input.description || "")
      .trim()
      .slice(0, 200),
    permissions: cleanPermissions(input.permissions),
    locked: false,
  };
}

export function buildRole(input, existingIds = []) {
  const name = String(input?.name || "")
    .trim()
    .slice(0, 48);
  if (name.length < 2) return null;
  const base = slugify(name) || "role";
  let id = base === OWNER_ROLE_ID ? "role-owner" : base;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${base === OWNER_ROLE_ID ? "role-owner" : base}-${suffix}`;
    suffix += 1;
  }
  return {
    id,
    name,
    description: String(input?.description || "")
      .trim()
      .slice(0, 200),
    permissions: cleanPermissions(input?.permissions),
    locked: false,
  };
}

export function defaultRoles() {
  return clone(DEFAULT_ROLES);
}

export async function loadRoles() {
  const stored = await kvGet(ROLES_KEY, null);
  const list = Array.isArray(stored)
    ? stored.map((entry, index) => normalizeRole(entry, index)).filter(Boolean)
    : [];
  if (list.length === 0) return defaultRoles();
  if (!list.some((role) => role.id === OWNER_ROLE_ID)) list.unshift(clone(DEFAULT_ROLES[0]));
  return list;
}

export async function saveRoles(roles) {
  const clean = Array.isArray(roles)
    ? roles.map((entry, index) => normalizeRole(entry, index)).filter(Boolean)
    : [];
  await kvSet(ROLES_KEY, clean);
  return clean;
}

export async function loadGrants() {
  const raw = await kvGet(GRANTS_KEY, {});
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

export async function saveGrants(grants) {
  await kvSet(GRANTS_KEY, grants && typeof grants === "object" ? grants : {});
}

export const ROLE_IDS = DEFAULT_ROLES.map((role) => role.id);

export function fallbackRole(roles) {
  return (
    roles.find((role) => role.id === "viewer") ||
    roles.find((role) => role.id !== OWNER_ROLE_ID) ||
    clone(DEFAULT_ROLES[0])
  );
}

function resolveName(roles, grants, name) {
  const username = normalizeUsername(name);
  if (!username) return null;
  if (isSuperOwner(username)) {
    return {
      username,
      roleId: OWNER_ROLE_ID,
      roleName: "Super owner",
      description: "Full access, cannot be removed or deleted.",
      permissions: ["*"],
      owner: true,
      source: "super",
      grantedBy: null,
      grantedAt: null,
    };
  }
  const grant = grants[username];
  if (!grant) return null;
  const role = roles.find((entry) => entry.id === grant.roleId) || fallbackRole(roles);
  return {
    username,
    roleId: role.id,
    roleName: role.name,
    description: role.description,
    permissions: role.permissions,
    owner: false,
    source: "manual",
    grantedBy: grant.grantedBy || null,
    grantedAt: grant.grantedAt || null,
  };
}

export async function resolveAdmin(username) {
  const roles = await loadRoles();
  const grants = await loadGrants();
  return resolveName(roles, grants, username);
}

export async function listAdmins() {
  const roles = await loadRoles();
  const grants = await loadGrants();
  const names = new Set([
    normalizeUsername(SUPER_OWNER),
    ...Object.keys(grants).map((entry) => normalizeUsername(entry)),
  ]);
  return Array.from(names)
    .filter(Boolean)
    .sort()
    .map((name) => resolveName(roles, grants, name))
    .filter(Boolean);
}

export function can(access, permission) {
  if (!access) return false;
  if (access.owner === true) return true;
  if (OWNER_ONLY_PERMISSIONS.includes(permission)) return false;
  const list = Array.isArray(access.permissions) ? access.permissions : [];
  return list.includes("*") || list.includes(permission);
}

export function publicRole(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    locked: role.locked,
  };
}

export function sanitizeGrants(grants, roleId) {
  const next = {};
  for (const [name, grant] of Object.entries(grants || {})) {
    if (!grant || typeof grant !== "object") continue;
    next[normalizeUsername(name)] = {
      roleId: grant.roleId === roleId ? "viewer" : grant.roleId,
      grantedBy: grant.grantedBy || null,
      grantedAt: grant.grantedAt || null,
    };
  }
  return next;
}
