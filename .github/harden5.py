import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
path = root / "app/api/auth/register/route.js"
text = path.read_text()

old = """  // Sending a confirmation code needs the session secret. Without it the send
  // would throw halfway through registration, so say what's missing instead.
  if (isEmailConfigured() && !isCodeSecretConfigured()) {"""
new = """  // A member session and any confirmation code are signed with the session
  // secret. Without it sign-up cannot finish, so say what's missing up front.
  if (!isCodeSecretConfigured()) {"""

if text.count(old) != 1:
    raise SystemExit("guard block not found once")
path.write_text(text.replace(old, new))
print("guard widened")
