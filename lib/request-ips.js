// Every address a request arrived from.
//
// One account per internet connection is only as good as the address we read,
// and different proxies fill in different headers: a VPN can change the
// forwarded address while the real socket address stays put, a mobile network
// rewrites one but not the other. So we collect them all and treat a match on
// any of them as the same connection.

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
  // Strip a port ("1.2.3.4:51234"), brackets ("[::1]:443") and IPv6 zone ids.
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];
  ip = ip.replace(/%.*$/, "");
  // ::ffff:1.2.3.4 is just the IPv4 address wearing an IPv6 hat.
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

// Where the connection says it is, when the host provides it (Vercel sets these
// on every request). Kept beside the address so an admin can tell two accounts
// on the same network apart, and so a changed address doesn't hide the match.
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
