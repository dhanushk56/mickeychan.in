import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")


def read(path):
    return (root / path).read_text()


def write(path, text):
    (root / path).write_text(text)


def drop_function(path, header):
    text = read(path)
    lines = text.split("\n")
    start = next((i for i, line in enumerate(lines) if line.startswith(header)), None)
    if start is None:
        raise SystemExit(f"{path}: no {header}")
    depth = 0
    end = None
    for i in range(start, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if depth == 0 and i > start:
            end = i
            break
    if end is None:
        raise SystemExit(f"{path}: unterminated {header}")
    if end + 1 < len(lines) and lines[end + 1].strip() == "":
        end += 1
    del lines[start:end + 1]
    write(path, "\n".join(lines))
    print(f"  removed {header.strip()} from {path}")


GUARD = """  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

"""


def drop_guards(path, expected):
    text = read(path)
    found = text.count(GUARD)
    if found != expected:
        raise SystemExit(f"{path}: expected {expected} guard(s), found {found}")
    write(path, text.replace(GUARD, ""))
    print(f"  removed {found} guard(s) from {path}")


ROUTES = {
    "app/api/join/route.js": 1,
    "app/api/account/profile/route.js": 1,
    "app/api/account/avatar/route.js": 2,
    "app/api/auth/verify/confirm/route.js": 1,
    "app/api/auth/verify/otp/route.js": 1,
    "app/api/auth/password/reset/route.js": 1,
    "app/api/auth/password/request/route.js": 1,
    "app/api/auth/register/route.js": 1,
    "app/api/auth/member/route.js": 1,
}

print("inline origin checks")
for route, guards in ROUTES.items():
    drop_function(route, "function sameOrigin(request) {")
    drop_guards(route, guards)

print("fail-closed secrets")


def fail_closed(path):
    text = read(path)
    old = '  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";'
    new = """  const value = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return value;"""
    if text.count(old) != 1:
        raise SystemExit(f"{path}: secret fallback not found")
    write(path, text.replace(old, new))
    print(f"  {path} now fails closed")


fail_closed("lib/password-reset.js")
fail_closed("lib/email-verification.js")

print("done")
