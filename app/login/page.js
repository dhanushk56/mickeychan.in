import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberLogin from "@/components/MemberLogin";
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
  email_taken:
    "That email address already belongs to an account with a password. Log in with your password instead.",
  ip_limit: "This internet connection already has an account. Log in with it instead.",
  discord_unavailable: "Discord sign-in isn't set up on this site yet.",
  discord_denied: "Discord sign-in was cancelled.",
  discord_failed: "Discord sign-in didn't finish. Please try again.",
  discord_state: "That Discord sign-in attempt expired. Please try again.",
  discord_no_email: "Discord didn't share an email address, so no account was created.",
  discord_email_unverified: "Discord hasn't confirmed that email address, so no account was created.",
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

  return (
    <MemberLogin
      next={next}
      hasAccounts={await hasMembers()}
      googleEnabled={isGoogleConfigured()}
      discordEnabled={isDiscordConfigured()}
      initialError={ERRORS[errorCode] || ""}
    />
  );
}
