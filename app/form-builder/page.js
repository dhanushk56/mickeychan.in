import Link from "next/link";
import { getSession } from "@/lib/auth-guard";
import { kvGet } from "@/lib/kv";
import { can, resolveAdmin } from "@/lib/roles";
import PasswordGate from "@/components/PasswordGate";
import FormsList from "@/components/form-builder/FormsList";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = { title: "Form Builder" };

export default async function FormBuilderPage() {
  const session = await getSession();

  if (!session.authenticated) {
    return <PasswordGate area="The form builder" />;
  }

  const access = await resolveAdmin(session.user.username);
  if (!access || !can(access, "forms.view")) {
    return (
      <div className="page">
        <div className="shell" style={{ maxWidth: "34rem" }}>
          <div className="glass-card p-8 text-center">
            <p className="font-display text-xl font-bold mb-2">Not your area</p>
            <p className="muted text-sm mb-6">
              Your account can&apos;t open the form builder. Ask an administrator for the forms
              permission.
            </p>
            <Link href="/hub" className="btn btn-secondary">
              Back to the hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const forms = await kvGet("formbuilder:index", []);

  return <FormsList initialForms={forms} currentUser={session.user} />;
}
