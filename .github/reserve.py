import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")

def patch(path, old, new):
    p = root / path
    text = p.read_text()
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{path}: expected 1 match, found {n}")
    p.write_text(text.replace(old, new))
    print(f"  patched {path}")

patch(
    "lib/members.js",
    """function usernameProblem(username) {
  const handle = normalize(username);
  if (!handle) return "Pick a username.";
  if (!USERNAME_PATTERN.test(handle)) {""",
    """export function isUsernameReserved(username) {
  // The super owner is identified by this handle, so nobody else may hold it
  // through signup, admin creation or a rename. The owner's own account is
  // provisioned in data/users.json, which bypasses these paths.
  return isRootOwner(username);
}

function usernameProblem(username) {
  const handle = normalize(username);
  if (!handle) return "Pick a username.";
  if (isUsernameReserved(handle)) return "That username is already taken.";
  if (!USERNAME_PATTERN.test(handle)) {""",
)

patch(
    "lib/member-handles.js",
    'import { isUsernameTaken } from "@/lib/members";',
    'import { isUsernameReserved, isUsernameTaken } from "@/lib/members";',
)

patch(
    "lib/member-handles.js",
    """  while (await isUsernameTaken(candidate)) {""",
    """  while ((await isUsernameTaken(candidate)) || isUsernameReserved(candidate)) {""",
)

print("done")
