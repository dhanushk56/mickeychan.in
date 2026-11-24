import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
path = root / "app/api/auth/register/route.js"
text = path.read_text()

old_import = 'import { sendCodeEmail } from "@/lib/email-verification";'
new_import = 'import { isCodeSecretConfigured, sendCodeEmail } from "@/lib/email-verification";'
if text.count(old_import) != 1:
    raise SystemExit("import line not found once")
text = text.replace(old_import, new_import)

old = "export async function POST(request) {\n"
new = """export async function POST(request) {
  // Sending a confirmation code needs the session secret. Without it the send
  // would throw halfway through registration, so say what's missing instead.
  if (isEmailConfigured() && !isCodeSecretConfigured()) {
    return NextResponse.json(
      { error: "Sign-up isn't fully set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

"""
if text.count(old) != 1:
    raise SystemExit("POST handler not found once")
path.write_text(text.replace(old, new))
print("patched register route")
