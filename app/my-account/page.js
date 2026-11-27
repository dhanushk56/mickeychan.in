import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountPanel from "@/components/AccountPanel";
import { findMember, memberFromCookieStore, publicProfile } from "@/lib/members";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function MyAccountPage() {
  const session = await memberFromCookieStore(cookies());
  if (!session) redirect(`/login?next=${encodeURIComponent("/my-account")}`);

  const member = await findMember(session.username);
  if (!member) redirect(`/login?next=${encodeURIComponent("/my-account")}`);

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "42rem" }}>
        <AccountPanel
          profile={publicProfile(member)}
          verificationRequired={EMAIL_VERIFICATION_REQUIRED}
        />
      </div>
    </div>
  );
}
