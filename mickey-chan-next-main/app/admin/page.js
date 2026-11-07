import { getSession } from "@/lib/auth-guard";
import AuthGate from "@/components/AuthGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Mickey Chan" };

export default async function AdminPage() {
  const session = getSession();

  if (!session.authenticated || !session.authorized) {
    return <AuthGate session={session} next="/admin" area="The admin dashboard" />;
  }

  return <AdminDashboard currentUser={session.user} />;
}
