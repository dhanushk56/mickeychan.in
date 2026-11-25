import { kvGet, kvSet } from "@/lib/kv";

export const SUPER_OWNER = "dsk13426";
export const OWNER_ROLE_ID = "owner";

const ROLES_KEY = "roles:list";
const GRANTS_KEY = "roles:grants";
const OWNERS_KEY = "roles:owners";

const DEFAULT_ADMIN_EXCLUDED = ["roles.view", "roles.manage", "admins.manage"];

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
    id: "site",
    label: "Site status",
    permissions: [
      { id: "site.maintenance", label: "Close the site for maintenance and reopen it" },
      { id: "site.bypass-maintenance", label: "Keep using the site while it is closed" },
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
    id: "polls",
    label: "Polls",
    permissions: [
      { id: "polls.view", label: "See polls" },
      { id: "polls.create", label: "Open and close a poll" },
      { id: "polls.delete", label: "Delete a poll and its votes" },
    ],
  },
  {
    id: "events",
    label: "Events",
    permissions: [
      { id: "events.view", label: "See events" },
      { id: "events.create", label: "Add an event" },
      { id: "events.delete", label: "Delete an event" },
    ],
  },
  {
    id: "ideas",
    label: "Idea board",
    permissions: [
      { id: "ideas.view", label: "See ideas" },
      { id: "ideas.moderate", label: "Move an idea between open, planned, shipped and not this time" },
      { id: "ideas.delete", label: "Delete an idea" },
    ],
  },
  {
    id: "enquiries",
    label: "Contact inbox",
    permissions: [
      { id: "enquiries.view", label: "Read contact enquiries" },
      { id: "enquiries.manage", label: "Update enquiry status and notes" },
      { id: "enquiries.delete", label: "Delete an enquiry" },
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

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);

const DEFAULT_ROLES = [
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
    permissions: ALL_PERMISSIONS.filter((permission) => !DEFAULT_ADMIN_EXCLUDED.includes(permission)),
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
      "enquiries.view",
      "enquiries.manage",
      "enquiries.delete",
      "accounts.view",
      "accounts.block",
      "forms.view",
      "announcements.view",
      "polls.view",
      "events.view",
      "ideas.view",
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
      "enquiries.view",
      "announcements.view",
      "polls.view",
      "events.view",
      "ideas.view",
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
      "enquiries.view",
      "forms.view",
      "accounts.view",
      "announcements.view",
      "polls.view",
      "events.view",
      "ideas.view",
      "content.view",
    ],
    locked: false,
  },
];

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function isRootOwner(value) {
  const name = normalizeUsername(value);
  return Boolean(name) && name === SUPER_OWNER;
}

export async function loadOwners() {
  const stored = await kvGet(OWNERS_KEY, []);
  const list = Array.isArray(stored)
    ? stored.map((entry) => normalizeUsername(entry)).filter(Boolean)
    : [];
  return Array.from(new Set([normalizeUsername(SUPER_OWNER), ...list]));
}

export async function saveOwners(owners) {
  const list = Array.from(
    new Set((Array.isArray(owners) ? owners : []).map((entry) => normalizeUsername(entry)).filter(Boolean))
  ).filter((name) => !isRootOwner(name));
  await kvSet(OWNERS_KEY, list);
  return list;
}

export async function isOwnerAccount(value) {
  const name = normalizeUsername(value);
  if (!name) return false;
  if (isRootOwner(name)) return true;
  return (await loadOwners()).includes(name);
}

export function roleRank(roles, roleId) {
  const list = Array.isArray(roles) ? roles : [];
  const index = list.findIndex((role) => role.id === roleId);
  return index === -1 ? list.length : index;
}

export function adminRank(roles, entry) {
  if (!entry) return Array.isArray(roles) ? roles.length : 0;
  if (entry.owner) return 0;
  return roleRank(roles, entry.roleId);
}

export function outranks(actor, roles, rank) {
  if (!actor) return false;
  if (actor.root === true) return true;
  return roleRank(roles, actor.roleId) < rank;
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

// Polls, events and ideas used to be gated on the announcement permissions. Roles saved
// before they got their own permissions keep the access they already had; once a role has
// been saved with its own permissions, that explicit list is what counts.
const SPLIT_FROM_ANNOUNCEMENTS = {
  "announcements.view": ["polls.view", "events.view", "ideas.view"],
  "announcements.create": ["polls.create", "events.create", "ideas.moderate"],
  "announcements.delete": ["polls.delete", "events.delete", "ideas.delete"],
};

function carryCommunityAccess(list) {
  if (!Array.isArray(list)) return list;
  const next = new Set(list);
  for (const [source, targets] of Object.entries(SPLIT_FROM_ANNOUNCEMENTS)) {
    if (!next.has(source)) continue;
    for (const target of targets) next.add(target);
  }
  return Array.from(next);
}

export function normalizeRole(input, index = 0, options = {}) {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name || "")
    .trim()
    .slice(0, 48);
  if (!name) return null;
  const id = slugify(input.id || name) || `role-${index + 1}`;
  // The old preset bypass role is retired. Anything still stored under this id
  // is dropped on read, so it cannot reappear on the next page load.
  if (id === "bypass-maintenance") return null;
  if (id === OWNER_ROLE_ID) {
    return clone(DEFAULT_ROLES[0]);
  }
  return {
    id,
    name,
    description: String(input.description || "")
      .trim()
      .slice(0, 200),
    permissions: cleanPermissions(
      options.migrateCommunity ? carryCommunityAccess(input.permissions) : input.permissions
    ),
    communitySplit: true,
    locked: false,
  };
}

export function buildRole(input, existingIds = []) {
  const name = String(input?.name || "")
    .trim()
    .slice(0, 48);
  if (name.length < 2) return null;
  const base = slugify(name) || "role";
  // The retired preset id is never handed out again. A role with the same name
  // is still allowed, it just gets a different id.
  let id =
    base === OWNER_ROLE_ID
      ? "role-owner"
      : base === "bypass-maintenance"
        ? "role-bypass-maintenance"
        : base;
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

function defaultRoles() {
  return clone(DEFAULT_ROLES);
}

export async function loadRoles() {
  const stored = await kvGet(ROLES_KEY, null);
  const list = Array.isArray(stored)
    ? stored
        .map((entry, index) =>
          normalizeRole(entry, index, { migrateCommunity: entry?.communitySplit !== true })
        )
        .filter(Boolean)
    : [];
  if (list.length === 0) return defaultRoles();
  if (!list.some((role) => role.id === OWNER_ROLE_ID)) list.unshift(clone(DEFAULT_ROLES[0]));

  // Roles saved before these existed keep working with the new checks.
  const sitePermissions = ["site.maintenance", "site.bypass-maintenance"];
  return list.map((role) =>
    role.id === "administrator"
      ? { ...role, permissions: Array.from(new Set([...role.permissions, ...sitePermissions])) }
      : role
  );
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

function fallbackRole(roles) {
  return (
    roles.find((role) => role.id === "viewer") ||
    roles.find((role) => role.id !== OWNER_ROLE_ID) ||
    clone(DEFAULT_ROLES[0])
  );
}

function resolveName(roles, grants, owners, name) {
  const username = normalizeUsername(name);
  if (!username) return null;
  if (owners.includes(username)) {
    const root = isRootOwner(username);
    return {
      username,
      roleId: OWNER_ROLE_ID,
      roleName: "Super owner",
      description: root
        ? "Full access, cannot be removed or deleted."
        : "Full access, granted by the owner and only the owner can take it away.",
      permissions: ["*"],
      owner: true,
      root,
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
    root: false,
    source: "manual",
    grantedBy: grant.grantedBy || null,
    grantedAt: grant.grantedAt || null,
  };
}

export async function resolveAdmin(username) {
  const [roles, grants, owners] = await Promise.all([loadRoles(), loadGrants(), loadOwners()]);
  return resolveName(roles, grants, owners, username);
}

export async function listAdmins() {
  const [roles, grants, owners] = await Promise.all([loadRoles(), loadGrants(), loadOwners()]);
  const names = new Set([
    ...owners,
    ...Object.keys(grants).map((entry) => normalizeUsername(entry)),
  ]);
  return Array.from(names)
    .filter(Boolean)
    .sort()
    .map((name) => resolveName(roles, grants, owners, name))
    .filter(Boolean);
}

export function can(access, permission) {
  if (!access) return false;
  if (access.owner === true) return true;
  const list = Array.isArray(access.permissions) ? access.permissions : [];
  return list.includes("*") || list.includes(permission);
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
