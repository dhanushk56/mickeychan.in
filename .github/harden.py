import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")


def read(path):
    return (root / path).read_text()


def write(path, text):
    (root / path).write_text(text)
    print(f"  wrote {path}")


def patch(path, old, new, count=1):
    text = read(path)
    found = text.count(old)
    if found != count:
        raise SystemExit(f"{path}: expected {count} match(es), found {found}")
    write(path, text.replace(old, new))


PROXY = '''import { NextResponse } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function sameOrigin(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("origin");
  // Browsers always send Origin on a mutating request. No Origin means a
  // script, a webhook or a server calling the API directly.
  if (!origin) return true;

  const host = hostOf(origin);
  if (!host) return false;

  const candidates = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  try {
    candidates.push(new URL(request.url).host);
  } catch {
  }
  return candidates.filter(Boolean).includes(host);
}

export default function proxy(request) {
  if (!MUTATING.has(request.method)) return NextResponse.next();
  if (sameOrigin(request)) return NextResponse.next();
  return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
'''

CLIENT_KEY = '''function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

'''

print("proxy.js")
write("proxy.js", PROXY)

print("lib/request-ips.js")
patch(
    "lib/request-ips.js",
    'const HEADERS = ["x-forwarded-for", "x-real-ip", "x-vercel-forwarded-for"];',
    '// Vercel overwrites x-forwarded-for, and x-vercel-forwarded-for survives even\n'
    '// when something else sits in front of it, so it is the one to trust first.\n'
    'const HEADERS = ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"];',
)
patch(
    "lib/request-ips.js",
    "  return [...new Set(found)].slice(0, 8);\n}\n",
    """  return [...new Set(found)].slice(0, 8);
}

// One rate-limit identity per client, preferring the platform-set header.
export function clientKey(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== "function") return "local";
  for (const name of HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;
    const ip = cleanIp(String(raw).split(",")[0]);
    if (ip) return ip;
  }
  return "local";
}
""",
)

print("routes")
ROUTES = [
    "app/api/auth/verify/confirm/route.js",
    "app/api/auth/login/route.js",
    "app/api/auth/password/reset/route.js",
    "app/api/auth/password/request/route.js",
    "app/api/auth/register/route.js",
]
IMPORT = 'import { clientKey } from "@/lib/request-ips";\n\n'

for route in ROUTES:
    patch(route, CLIENT_KEY, "")
    patch(route, "\nexport const dynamic", "\n" + IMPORT + "export const dynamic")

member = "app/api/auth/member/route.js"
patch(member, CLIENT_KEY, "")
patch(
    member,
    'import { requestIps, requestLocation } from "@/lib/request-ips";',
    'import { clientKey, requestIps, requestLocation } from "@/lib/request-ips";',
)

print("register failures")
patch(
    "app/api/auth/register/route.js",
    """    const conflict = result.code === "ip_limit" || result.error.includes("already taken");""",
    """    // Rejected attempts count too, so one connection cannot probe usernames or
    // addresses indefinitely without tripping the limit.
    await recordHit("register", key, LIMIT);
    const conflict = result.code === "ip_limit" || result.error.includes("already taken");""",
)

print("done")
