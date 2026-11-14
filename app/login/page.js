import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberLogin from "@/components/MemberLogin";
import { hasMembers, memberFromCookieStore } from "@/lib/members";
import { isGoogleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export const metadata = { title: "Log in" };

const ERRORS = {
  google_unavailable: "Google sign-in isn't set up on this site yet.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't finish. Please try again.",
  google_state: "That Google sign-in attempt expired. Please try again.",
  google_email_unverified: "Google couldn't confirm that email address, so no account was created.",
  email_taken:
    "That email address already belongs to an account with a password. Log in with your password instead.",
  ip_limit: "This internet connection already has an account. Log in with it instead.",
  verify_invalid: "That confirmation link has expired or was already used.",
};

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function LoginPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const member = await memberFromCookieStore(cookies());
  if (member) redirect(next);

  const errorCode = typeof searchParams?.error === "string" ? searchParams.error : "";
  const initialError = ERRORS[errorCode] || "";
  const initialCode = errorCode === "verify_invalid" ? "verify_invalid" : "";

  return (
    <MemberLogin
      next={next}
      hasAccounts={await hasMembers()}
      googleEnabled={isGoogleConfigured()}
      initialError={initialError}
      initialCode={initialCode}
    />
  );
}
