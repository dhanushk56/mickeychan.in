import crypto from "node:crypto";

function secret() {
  const value = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return value;
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createOAuthState(next) {
  const state = crypto.randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ state, next })).toString("base64url");
  return { state, value: `${payload}.${sign(payload)}` };
}

export function readOAuthState(value, state) {
  if (!value || !state) return null;
  const [payload, signature] = String(value).split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || parsed.state !== state) return null;
    return parsed;
  } catch {
    return null;
  }
}
