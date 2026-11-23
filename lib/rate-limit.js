import { kvDel, kvGet, kvIncr } from "@/lib/kv";

function windowKey(scope, id, windowMs, now) {
  return `ratelimit:${scope}:${id}:${Math.floor(now / windowMs)}`;
}

export async function limitReached(scope, id, { max, windowMs }) {
  const now = Date.now();
  const count = Number(await kvGet(windowKey(scope, id, windowMs, now), 0));
  return {
    limited: count >= max,
    retryAfter: Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000)),
  };
}

export async function recordHit(scope, id, { windowMs }) {
  const now = Date.now();
  return kvIncr(windowKey(scope, id, windowMs, now), Math.ceil((windowMs / 1000) * 2));
}

export async function clearHits(scope, id, { windowMs }) {
  const now = Date.now();
  await kvDel(windowKey(scope, id, windowMs, now));
}
