import crypto from "node:crypto";
import usersFile from "@/data/users.json";
import { kvGet, kvSet } from "@/lib/kv";

// Site accounts (applicants), separate from the shared admin password.
//
// Two sources feed one namespace:
//   data/users.json       — accounts committed with the repo (seed/admin-managed)
//   KV "members:registered" — accounts created through /register, because the
//                             deployed filesystem is read-only
// Only salted scrypt hashes are stored, never the password itself. There is no
// self-service reset: a forgotten password has to be replaced by whoever can
// edit users.json (or the KV entry) and redeploy.

const MEMBER_COOKIE = "mc_member_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REGISTERED_KEY = "members:registered";

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

async function allMembers() {
  return [...seedMembers(), ...(await registeredMembers())];
}

export async function findMember(username) {
  const needle = normalize(username);
  if (!needle) return null;
  return (await allMembers()).find((user) => normalize(user.username) === needle) || null;
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

  const salt = crypto.randomBytes(16).toString("hex");
  const member = {
    username: String(username).trim(),
    name: String(name || "").trim() || String(username).trim(),
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  const registered = await registeredMembers();
  registered.push(member);
  await kvSet(REGISTERED_KEY, registered);

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

export function createMemberToken(member) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: member.username,
      name: member.name || member.username,
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
    return { sub: data.sub, name: data.name };
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
  return { username: member.username, name: member.name || member.username };
}
