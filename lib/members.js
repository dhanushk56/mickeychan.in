import crypto from "node:crypto";
import usersFile from "@/data/users.json";
import { kvGet, kvSet } from "@/lib/kv";

// Site accounts (applicants), separate from the shared admin password.
//
// Two write-anywhere layers sit on top of the committed file, because the
// deployed filesystem is read-only:
//   data/users.json          — accounts committed with the repo (seed accounts)
//   KV members:registered    — accounts created through /register
//   KV members:overrides     — password changes made by an admin for seed accounts
//   KV members:deleted       — seed accounts an admin deleted (the line stays in
//                              the file, but the account stops existing)
// Only salted scrypt hashes are stored, never the password itself.

const MEMBER_COOKIE = "mc_member_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REGISTERED_KEY = "members:registered";
const OVERRIDES_KEY = "members:overrides";
const DELETED_KEY = "members:deleted";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const MIN_PASSWORD_LENGTH = 8;

function normalize(username) {
  return String(username || "").trim().toLowerCase();
}

function seedMembers() {
  return Array.isArray(usersFile?.users) ? usersFile.users : [];
}

async function registeredMembers() {
  const stored = await kvGet(REGISTERED_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

async function passwordOverrides() {
  const stored = await kvGet(OVERRIDES_KEY, {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

async function deletedUsernames() {
  const stored = await kvGet(DELETED_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

// Entries are `{ username, hash }`; bare usernames are still honoured in case
// an older write left one behind.
function deletionHandle(entry) {
  return normalize(typeof entry === "string" ? entry : entry?.username);
}

// A deleted seed account stays deleted only while it keeps the same password
// hash, so adding it again with `npm run user:add` (a fresh salt and hash) is
// treated as a new account — the only way back for an account that lives in a
// file that can't be rewritten at runtime.
function matchesDeletion(entry, member) {
  if (deletionHandle(entry) !== normalize(member.username)) return false;
  if (typeof entry === "string") return true;
  return !entry.hash || entry.hash === member.hash;
}

// Seed accounts, minus deleted ones, with any admin password change applied.
async function allMembers() {
  const [registered, overrides, deleted] = await Promise.all([
    registeredMembers(),
    passwordOverrides(),
    deletedUsernames(),
  ]);
  const seed = seedMembers()
    .filter((user) => !deleted.some((entry) => matchesDeletion(entry, user)))
    .map((user) => {
      const override = overrides[normalize(user.username)];
      return {
        ...user,
        ...(override?.salt && override?.hash
          ? { salt: override.salt, hash: override.hash, updatedAt: override.updatedAt }
          : {}),
        source: "file",
      };
    });

  return [...seed, ...registered.map((user) => ({ ...user, source: "registered" }))];
}

export async function findMember(username) {
  const needle = normalize(username);
  if (!needle) return null;
  return (await allMembers()).find((user) => normalize(user.username) === needle) || null;
}

// Public listing for the admin console — never leaves the building with hashes.
export async function listMembers() {
  const members = await allMembers();
  return members
    .map((member) => ({
      username: member.username,
      name: member.name || member.username,
      source: member.source,
      createdAt: member.createdAt || null,
      updatedAt: member.updatedAt || null,
      hasPassword: Boolean(member.salt && member.hash),
    }))
    .sort((a, b) => normalize(a.username).localeCompare(normalize(b.username)));
}

export async function hasMembers() {
  return (await allMembers()).length > 0;
}

export function publicMember(member) {
  if (!member) return null;
  return { username: member.username, name: member.name || member.username };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

// Constant-time compare of the derived keys.
export function verifyMemberPassword(member, password) {
  if (!member || typeof password !== "string" || !member.salt || !member.hash) return false;
  const attempt = Buffer.from(hashPassword(password, member.salt), "hex");
  const expected = Buffer.from(String(member.hash), "hex");
  if (attempt.length !== expected.length || expected.length === 0) return false;
  return crypto.timingSafeEqual(attempt, expected);
}

export function usernameProblem(username) {
  const handle = normalize(username);
  if (!handle) return "Pick a username.";
  if (!USERNAME_PATTERN.test(handle)) {
    return "Usernames are 3–24 characters: letters, numbers, dot, dash or underscore, starting with a letter or number.";
  }
  return null;
}

export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

// Creates a registered account. Returns { member } or { error }.
export async function registerMember({ username, name, password }) {
  const problem = usernameProblem(username) || passwordProblem(password);
  if (problem) return { error: problem };

  const handle = normalize(username);
  if (await findMember(handle)) return { error: "That username is already taken." };
  // A deleted seed account keeps its name reserved so nobody can inherit an
  // application history that was wiped for a reason.
  if ((await deletedUsernames()).some((entry) => deletionHandle(entry) === handle)) {
    return { error: "That username is already taken." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const member = {
    username: String(username).trim(),
    name: String(name || "").trim() || String(username).trim(),
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const registered = await registeredMembers();
  registered.push(member);
  await kvSet(REGISTERED_KEY, registered);

  return { member };
}

// Admin action: set anybody's password. Returns { member } or { error }.
export async function setMemberPassword(username, password) {
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  const salt = crypto.randomBytes(16).toString("hex");
  const updatedAt = new Date().toISOString();
  const next = { salt, hash: hashPassword(password, salt), updatedAt };

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === normalize(username));
    if (index === -1) return { error: "No account with that username." };
    registered[index] = { ...registered[index], ...next };
    await kvSet(REGISTERED_KEY, registered);
  } else {
    const overrides = await passwordOverrides();
    overrides[normalize(username)] = next;
    await kvSet(OVERRIDES_KEY, overrides);
  }

  return { member: { ...member, ...next } };
}

// Admin action: delete the account. Application history is left alone.
export async function deleteMember(username) {
  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const next = registered.filter((entry) => normalize(entry.username) !== normalize(username));
    if (next.length === registered.length) return { error: "No account with that username." };
    await kvSet(REGISTERED_KEY, next);
  } else {
    // Remember which password was in place when the account was deleted, so a
    // later re-add with a different one counts as a different account.
    const deleted = (await deletedUsernames()).filter(
      (entry) => deletionHandle(entry) !== normalize(username)
    );
    deleted.push({ username: normalize(username), hash: member.hash, deletedAt: new Date().toISOString() });
    await kvSet(DELETED_KEY, deleted);
    const overrides = await passwordOverrides();
    if (overrides[normalize(username)]) {
      delete overrides[normalize(username)];
      await kvSet(OVERRIDES_KEY, overrides);
    }
  }

  return { member };
}

function signingSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
}

function sign(value) {
  return crypto.createHmac("sha256", signingSecret()).update(value).digest("hex");
}

function safeEqual(a = "", b = "") {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

// `rev` pins a session to the account as it was when the token was issued, so
// changing someone's password logs their other devices out.
function revisionOf(member) {
  return member?.updatedAt || member?.createdAt || "v1";
}

export function createMemberToken(member) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: member.username,
      name: member.name || member.username,
      rev: revisionOf(member),
      expires: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Signature/expiry check only — the account still has to be looked up, which
// is what keeps a deleted account from keeping a live session.
export function parseMemberToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expires || data.expires < Date.now() || !data.sub) return null;
    return { sub: data.sub, name: data.name, rev: data.rev };
  } catch {
    return null;
  }
}

export function memberCookieName() {
  return MEMBER_COOKIE;
}

export function memberCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${MEMBER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearMemberCookieHeader() {
  return `${MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Reads the token off an already-obtained cookies() store so callers can share
// one store per request (route handlers and server components both use this).
export async function memberFromCookieStore(store) {
  const claims = parseMemberToken(store?.get(MEMBER_COOKIE)?.value);
  if (!claims) return null;
  const member = await findMember(claims.sub);
  if (!member) return null;
  // Tokens minted before this revisioning existed have no `rev`; accept those
  // once, then normal comparisons take over.
  if (claims.rev !== undefined && claims.rev !== revisionOf(member)) return null;
  return { username: member.username, name: member.name || member.username };
}
