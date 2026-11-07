import { getSession } from "@/lib/auth-guard";
import { kvGet } from "@/lib/kv";
import PasswordGate from "@/components/PasswordGate";
import FormsList from "@/components/form-builder/FormsList";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = { title: "Form Builder" };

export default async function FormBuilderPage() {
  const session = getSession();

  if (!session.authenticated) {
    return <PasswordGate area="The form builder" />;
  }

  const forms = await kvGet("formbuilder:index", []);

  return <FormsList initialForms={forms} currentUser={session.user} />;
}
