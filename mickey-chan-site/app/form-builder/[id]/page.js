import { headers } from "next/headers";
import Link from "next/link";
import { getSession } from "@/lib/auth-guard";
import { kvGet } from "@/lib/kv";
import PasswordGate from "@/components/PasswordGate";
import FormBuilder from "@/components/form-builder/FormBuilder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Form Builder" };

export default async function FormBuilderEditPage({ params }) {
  const session = getSession();

  if (!session.authenticated) {
    return <PasswordGate area="The form builder" />;
  }

  const form = await kvGet(`formbuilder:form:${params.id}`, null);

  if (!form) {
    return (
      <div className="page">
        <div className="shell" style={{ maxWidth: "34rem" }}>
          <div className="glass-card p-8 text-center">
            <p className="font-display text-xl font-bold mb-2">Form not found</p>
            <p className="muted text-sm mb-6">
              It may have been deleted. Head back to see your other forms.
            </p>
            <Link href="/form-builder" className="btn btn-secondary">
              ← Back to your forms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const host = headers().get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const publicUrl = `${protocol}://${host}/form-builder/apply/${params.id}`;

  return (
    <FormBuilder
      initialForm={form}
      publicUrl={publicUrl}
      currentUser={session.user}
      formId={params.id}
    />
  );
}
