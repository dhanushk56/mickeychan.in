import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthFlip from "@/components/AuthFlip";
import { hasMembers, memberFromCookieStore } from "@/lib/members";
import { isGoogleConfigured } from "@/lib/google";
import { isDiscordConfigured } from "@/lib/discord";

export const dynamic = "force-dynamic";

export const metadata = { title: "Log in" };

const ERRORS = {
  google_unavailable: "Google sign-in isn't set up on this site yet.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't finish. Please try again.",
  google_state: "That Google sign-in attempt expired. Please try again.",
  google_email_unverified: "Google couldn't confirm that email address, so no account was created.",
  ip_limit: "This internet connection already has an account. Log in with it instead.",
  discord_unavailable: "Discord sign-in isn't set up on this site yet.",
  discord_denied: "Discord sign-in was cancelled.",
  discord_failed: "Discord sign-in didn't finish. Please try again.",
  discord_state: "That Discord sign-in attempt expired. Please try again.",
  discord_no_email: "Discord didn't share an email address, so no account was created.",
  discord_email_unverified: "Discord hasn't confirmed that email address, so no account was created.",
};

const SIGN_IN_METHODS = { google: "Google", discord: "Discord" };

// The address is already on file, so the message has to name the method that
// holds it. Saying "password" to someone who signed up with Google sends them
// looking for a password they never set.
function emailTakenError(owner) {
  if (owner === "password") {
    return "That email address already belongs to an account with a password. Log in with your password instead.";
  }
  if (SIGN_IN_METHODS[owner]) {
    return `That email address already belongs to an account that signs in with ${SIGN_IN_METHODS[owner]}. Log in with ${SIGN_IN_METHODS[owner]} instead.`;
  }
  return "That email address already belongs to an account here. Log in with the method you used to create it.";
}

function safeNext(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/positions";
  return value;
}

export default async function LoginPage({ searchParams }) {
  const query = await searchParams;
  const next = safeNext(query?.next);
  const member = await memberFromCookieStore(cookies());
  if (member) redirect(next);

  const errorCode = typeof query?.error === "string" ? query.error : "";
  const owner = typeof query?.owner === "string" ? query.owner : "";
  const initialError = errorCode === "email_taken" ? emailTakenError(owner) : ERRORS[errorCode] || "";
  const notice =
    query?.reset === "1" ? "Password updated. Log in with your new password." : "";

  return (
    <AuthFlip
      initialFace="login"
      next={next}
      hasAccounts={await hasMembers()}
      googleEnabled={isGoogleConfigured()}
      discordEnabled={isDiscordConfigured()}
      initialError={initialError}
      initialNotice={notice}
    />
  );
}
