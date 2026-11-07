import { getSession } from "@/lib/auth-guard";
import PasswordGate from "@/components/PasswordGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = getSession();

  if (!session.authenticated) {
    return <PasswordGate area="The admin console" />;
  }

  return <AdminDashboard currentUser={session.user} />;
}
