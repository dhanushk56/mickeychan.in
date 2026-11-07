import crypto from "node:crypto";

const SESSION_COOKIE = "mc_discord_session";
const STATE_COOKIE = "mc_discord_oauth_state";
const REDIRECT_COOKIE = "mc_discord_oauth_redirect";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function getAllowedIds() {
  return (process.env.ALLOWED_DISCORD_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAllowedDiscordId(id) {
  return getAllowedIds().includes(id);
}

// --- Session token: "<discordUserId>.<expiresAt>.<signature>" ---

export function createSessionToken({ id, username, avatar }) {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ id, username, avatar, expires })).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expires || data.expires < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionCookieHeader(token) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureFlag}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// --- OAuth state + redirect-target cookies (short-lived, used only during the login round trip) ---

export function stateCookieName() {
  return STATE_COOKIE;
}

export function redirectCookieName() {
  return REDIRECT_COOKIE;
}

export function shortLivedCookieHeader(name, value) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secureFlag}`;
}

export function clearCookieHeader(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// --- Server-side helpers for reading the session from a Server Component (via next/headers) ---

export function readSessionFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

export function discordAuthorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode({ code, redirectUri }) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    client_secret: process.env.DISCORD_CLIENT_SECRET || "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenResponse.ok) throw new Error("Discord token exchange failed.");
  const { access_token } = await tokenResponse.json();

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userResponse.ok) throw new Error("Failed to fetch Discord user.");
  const user = await userResponse.json();
  return { id: user.id, username: user.username, avatar: user.avatar };
}
