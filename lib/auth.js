import crypto from "node:crypto";
import { cookies } from "next/headers";
import { isAdminUsername } from "@/lib/admin-access";

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

export function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof candidate !== "string" || candidate.length === 0) return false;
  return safeEqual(candidate, expected);
}

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

export function getSessionFromCookies() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session || !isAdminUsername(session.user.username)) return null;
  return session;
}
