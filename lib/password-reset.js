import crypto from "node:crypto";
import { kvDel, kvGet, kvIncr, kvSet } from "@/lib/kv";

export function isCodeSecretConfigured() {
  return Boolean(process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD);
}

const PREFIX = "members:reset:";
const ATTEMPTS_PREFIX = "members:reset-attempts:";
const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 6;

function secret() {
  const value = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return value;
}

function addressKey(email) {
  return String(email || "").trim().toLowerCase();
}

function keyFor(email) {
  return `${PREFIX}${addressKey(email)}`;
}

function attemptsKeyFor(email) {
  return `${ATTEMPTS_PREFIX}${addressKey(email)}`;
}

function digest(email, code) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${addressKey(email)}:${code}`)
    .digest("hex");
}

function normalizeResetCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}

export async function issueResetCode(member) {
  const key = keyFor(member.email);
  const existing = await kvGet(key, null);
  const now = Date.now();

  if (existing && existing.sentAt && now - existing.sentAt < COOLDOWN_MS) {
    return {
      error: "cooldown",
      waitSeconds: Math.max(1, Math.ceil((COOLDOWN_MS - (now - existing.sentAt)) / 1000)),
    };
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  await kvSet(key, {
    hash: digest(member.email, code),
    username: member.username,
    expires: now + TTL_MS,
    sentAt: now,
  });
  // A fresh code gets a fresh budget.
  await kvDel(attemptsKeyFor(member.email));
  return { code };
}

export async function verifyResetCode(email, rawCode) {
  const code = normalizeResetCode(rawCode);
  if (!code) return { error: "Enter the 6-digit code from the email." };

  const key = keyFor(email);
  const record = await kvGet(key, null);
  if (!record || !record.expires || record.expires < Date.now()) {
    await kvDel(key);
    await kvDel(attemptsKeyFor(email));
    return { error: "That code has expired. Send a new one." };
  }

  // Count the guess before comparing it. The increment is atomic in the store,
  // so parallel requests cannot all read the same starting count and each get a
  // full budget; the seventh caller invalidates the code.
  const ttlSeconds = Math.max(1, Math.ceil((record.expires - Date.now()) / 1000));
  const used = Number(await kvIncr(attemptsKeyFor(email), ttlSeconds));
  if (!Number.isFinite(used) || used > MAX_ATTEMPTS) {
    await kvDel(key);
    await kvDel(attemptsKeyFor(email));
    return { error: "Too many attempts. Send a new code." };
  }

  const expected = Buffer.from(String(record.hash || ""), "hex");
  const attempt = Buffer.from(digest(email, code), "hex");
  const matches =
    expected.length > 0 &&
    expected.length === attempt.length &&
    crypto.timingSafeEqual(expected, attempt);

  if (!matches) {
    return { error: "That code doesn't match. Check the email and try again." };
  }

  await kvDel(key);
  await kvDel(attemptsKeyFor(email));
  return { ok: true, username: record.username || "" };
}

export async function clearResetCode(email) {
  await kvDel(keyFor(email));
  await kvDel(attemptsKeyFor(email));
}
