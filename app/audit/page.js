import { getSession } from "@/lib/auth-guard";
import PasswordGate from "@/components/PasswordGate";
import AuditLog from "@/components/admin/AuditLog";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const session = getSession();

  if (!session.authenticated) {
    return <PasswordGate area="The audit log" />;
  }

  return <AuditLog currentUser={session.user} />;
}
