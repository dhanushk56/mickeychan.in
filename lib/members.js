import crypto from "node:crypto";
import usersFile from "@/data/users.json";

// Site accounts (applicants), separate from the shared admin password.
//
// Credentials live in data/users.json so they travel with the repo: only a
// salted scrypt hash is stored, never the password itself. Add or change an
// account with `npm run user:add -- <username> "Full name"` — if the username
// already exists its password is replaced, and you need a redeploy for the
// change to go live. There is no self-service reset: a forgotten password has
// to be replaced by whoever can edit that file.

const MEMBER_COOKIE = "mc_member_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function listMembers() {
  return Array.isArray(usersFile?.users) ? usersFile.users : [];
}

export function findMember(username) {
  const needle = String(username || "").trim().toLowerCase();
  if (!needle) return null;
  return listMembers().find((user) => String(user.username).toLowerCase() === needle) || null;
}

export function hasMembers() {
  return listMembers().length > 0;
}

export function publicMember(member) {
  if (!member) return null;
  return {
    username: member.username,
    name: member.name || member.username,
  };
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

export function verifyMemberToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expires || data.expires < Date.now() || !data.sub) return null;
    // Deleting someone from users.json must also invalidate their session.
    const member = findMember(data.sub);
    if (!member) return null;
    return { username: member.username, name: member.name || member.username };
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
export function memberFromCookieStore(store) {
  return verifyMemberToken(store?.get(MEMBER_COOKIE)?.value);
}
