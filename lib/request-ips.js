
const HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-vercel-proxied-for",
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "fastly-client-ip",
];

function cleanIp(value) {
  let ip = String(value || "").trim().toLowerCase();
  if (!ip) return "";
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];
  ip = ip.replace(/%.*$/, "");
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (!ip || ip === "unknown" || ip === "-") return "";
  return ip;
}

export function requestIps(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== "function") return [];

  const found = [];
  for (const name of HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;
    for (const part of String(raw).split(",")) {
      const ip = cleanIp(part);
      if (ip) found.push(ip);
    }
  }
  return [...new Set(found)].slice(0, 24);
}

function decode(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function requestLocation(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== "function") return null;

  const location = {
    city: decode(headers.get("x-vercel-ip-city")),
    region: decode(headers.get("x-vercel-ip-country-region")),
    country: decode(headers.get("x-vercel-ip-country")),
    timezone: decode(headers.get("x-vercel-ip-timezone")),
    latitude: decode(headers.get("x-vercel-ip-latitude")),
    longitude: decode(headers.get("x-vercel-ip-longitude")),
  };

  return Object.values(location).some(Boolean) ? location : null;
}
