import re, sys, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")

def read(p):
    return (root / p).read_text()

def write(p, s):
    (root / p).write_text(s)

def drop_function(path, name):
    text = read(path)
    m = re.search(r'(?m)^(?:export )?(?:async )?function ' + name + r'\(', text)
    if not m:
        raise SystemExit(f"missing function {name} in {path}")
    end = text.find("\n}\n", m.end())
    if end == -1:
        raise SystemExit(f"no closing brace for {name} in {path}")
    end += len("\n}\n")
    out = (text[:m.start()] + text[end:])
    out = re.sub(r'\n{3,}', '\n\n', out)
    write(path, out)
    print(f"  removed function {path}:{name}")

def drop_const(path, name):
    text = read(path)
    new, n = re.subn(r'(?m)^export const ' + name + r' = [^\n]*\n\n?', '', text)
    if n != 1:
        raise SystemExit(f"drop_const {name} in {path} matched {n}")
    write(path, new)
    print(f"  removed const {path}:{name}")

def drop_export(path, name):
    text = read(path)
    new, n = re.subn(r'(?m)^export ((?:async )?function ' + name + r'\b)', r'\1', text)
    if n == 0:
        new, n = re.subn(r'(?m)^export (const ' + name + r'\b)', r'\1', text)
    if n != 1:
        raise SystemExit(f"de-export {name} in {path} matched {n}")
    write(path, new)
    print(f"  de-exported {path}:{name}")

dead_functions = {
    "lib/auth.js": ["sessionCookieName"],
    "lib/blacklist.js": ["isFormBlacklisted"],
    "lib/kv.js": ["isKvConfigured"],
    "lib/members.js": ["updateMemberProfile", "memberCookieName"],
    "lib/roles.js": ["publicRole"],
}
for path, names in dead_functions.items():
    for name in names:
        drop_function(path, name)

drop_const("lib/roles.js", "ROLE_IDS")

de_exports = {
    "components/LocalTime.js": ["utc12"],
    "lib/announcements.js": ["LEVEL_IDS", "endsAt"],
    "lib/applications.js": ["reapplyAvailableAt", "submissionsKey"],
    "lib/auth.js": ["verifySessionToken"],
    "lib/email-verification.js": ["normalizeCode"],
    "lib/email.js": ["senderAddress"],
    "lib/member-handles.js": ["suggestedBase"],
    "lib/members.js": [
        "avatarProblem", "emailProblem", "memberInitials", "memberUsingIps",
        "nameProblem", "normalizeEmail", "parseMemberToken", "phoneProblem",
        "profileChangeWindow", "usernameProblem",
    ],
    "lib/password-reset.js": ["normalizeResetCode"],
    "lib/rich-text.js": ["escapeHtml"],
    "lib/roles.js": ["ALL_PERMISSIONS", "DEFAULT_ROLES", "defaultRoles", "fallbackRole"],
}
for path, names in de_exports.items():
    for name in names:
        drop_export(path, name)

css = read("app/globals.css")
before = css
css = re.sub(r'(?m)^  \.hairline \{[^\n]*\n?\n?', '', css)
if css == before:
    raise SystemExit("hairline rule not found")
write("app/globals.css", css)
print("  removed .hairline rule from app/globals.css")

tw = read("tailwind.config.js")
tw = re.sub(r'\n  darkMode: \[[^\]]*\],', '', tw)
tw = re.sub(r'\n      colors: \{\n(?:.*\n)*?      \},', '', tw)
tw = re.sub(r'\n        inter: \["Inter", "system-ui", "sans-serif"\],', '', tw)
if "blush-bg" in tw or "darkMode" in tw or '"Inter"' in tw:
    raise SystemExit("tailwind cleanup incomplete")
write("tailwind.config.js", tw)
print("  cleaned tailwind.config.js")
print("done")
