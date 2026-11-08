import crypto from "node:crypto";
import { cookies } from "next/headers";

// Password protection for /admin and /form-builder.
//
// One shared password (ADMIN_PASSWORD) unlocks both areas. A successful login
// gets an HMAC-signed, HttpOnly cookie that expires after 12 hours — no OAuth
// provider, no external accounts, nothing stored client-side except the token.

const SESSION_COOKIE = "mc_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

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

export function isPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Constant-time comparison so response timing doesn't leak the password.
export function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof candidate !== "string" || candidate.length === 0) return false;
  return safeEqual(candidate, expected);
}

// The name typed on the login form is only a label for the activity log — the
// password remains the only thing that's checked, and leaving the name blank
// simply reads as "Admin". It rides inside the signed cookie so every action
// later in the session is attributed to the same person.
export function createSessionToken(name) {
  const username = String(name || "").trim().slice(0, 40) || "Admin";
  const payload = Buffer.from(
    JSON.stringify({ user: username, expires: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expires || data.expires < Date.now()) return null;
    // Sessions minted before names were stored still work; they just read as
    // "Admin" until the next sign-in.
    const username =
      typeof data.user === "string" && data.user.trim() ? data.user.trim().slice(0, 40) : "Admin";
    return { authenticated: true, user: { username } };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// For route handlers: returns the session or null. Use in every protected API.
export function getSessionFromCookies() {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}
