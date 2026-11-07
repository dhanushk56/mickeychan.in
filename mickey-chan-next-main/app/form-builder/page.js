import { getSession } from "@/lib/auth-guard";
import { kvGet } from "@/lib/kv";
import AuthGate from "@/components/AuthGate";
import FormsList from "@/components/form-builder/FormsList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Form Builder — Mickey Chan" };

export default async function FormBuilderPage() {
  const session = getSession();

  if (!session.authenticated || !session.authorized) {
    return <AuthGate session={session} next="/form-builder" area="The form builder" />;
  }

  const forms = await kvGet("formbuilder:index", []);

  return <FormsList initialForms={forms} currentUser={session.user} />;
}
