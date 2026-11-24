import pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")


def read(path):
    return (root / path).read_text()


def write(path, text):
    (root / path).write_text(text)
    print(f"  wrote {path}")


def patch(path, old, new):
    text = read(path)
    if text.count(old) != 1:
        raise SystemExit(f"{path}: expected 1 match, found {text.count(old)}")
    write(path, text.replace(old, new))


CHECK = """
export function isCodeSecretConfigured() {
  return Boolean(process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD);
}
"""

print("libs")
patch(
    "lib/password-reset.js",
    'import { kvDel, kvGet, kvIncr, kvSet } from "@/lib/kv";\n',
    'import { kvDel, kvGet, kvIncr, kvSet } from "@/lib/kv";\n' + CHECK,
)
patch(
    "lib/email-verification.js",
    'import { otpEmail, sendEmail } from "@/lib/email";\n',
    'import { otpEmail, sendEmail } from "@/lib/email";\n' + CHECK,
)

RESET_503 = """  if (!isCodeSecretConfigured()) {
    return NextResponse.json(
      { error: "Password reset isn't set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

"""
EMAIL_503 = """  if (!isCodeSecretConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation isn't set up yet. Ask the site owner to finish it." },
      { status: 503 }
    );
  }

"""

print("routes")
patch(
    "app/api/auth/password/request/route.js",
    'import { clearResetCode, issueResetCode } from "@/lib/password-reset";',
    'import { clearResetCode, isCodeSecretConfigured, issueResetCode } from "@/lib/password-reset";',
)
patch(
    "app/api/auth/password/request/route.js",
    "export async function POST(request) {\n",
    "export async function POST(request) {\n" + RESET_503,
)
patch(
    "app/api/auth/password/reset/route.js",
    'import { clearResetCode, verifyResetCode } from "@/lib/password-reset";',
    'import { clearResetCode, isCodeSecretConfigured, verifyResetCode } from "@/lib/password-reset";',
)
patch(
    "app/api/auth/password/reset/route.js",
    "export async function POST(request) {\n",
    "export async function POST(request) {\n" + RESET_503,
)
patch(
    "app/api/auth/verify/otp/route.js",
    'import { sendCodeEmail } from "@/lib/email-verification";',
    'import { isCodeSecretConfigured, sendCodeEmail } from "@/lib/email-verification";',
)
patch(
    "app/api/auth/verify/otp/route.js",
    "export async function POST(request) {\n",
    "export async function POST(request) {\n" + EMAIL_503,
)
patch(
    "app/api/auth/verify/confirm/route.js",
    'import { confirmCode } from "@/lib/email-verification";',
    'import { confirmCode, isCodeSecretConfigured } from "@/lib/email-verification";',
)
patch(
    "app/api/auth/verify/confirm/route.js",
    "export async function POST(request) {\n",
    "export async function POST(request) {\n" + EMAIL_503,
)

print("done")
