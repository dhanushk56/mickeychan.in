import { headers } from "next/headers";
import { getSession } from "@/lib/auth-guard";
import { kvGet } from "@/lib/kv";
import AuthGate from "@/components/AuthGate";
import FormBuilder from "@/components/form-builder/FormBuilder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Form Builder — Mickey Chan" };

export default async function FormBuilderEditPage({ params }) {
  const session = getSession();

  if (!session.authenticated || !session.authorized) {
    return <AuthGate session={session} next={`/form-builder/${params.id}`} area="The form builder" />;
  }

  const form = await kvGet(`formbuilder:form:${params.id}`, null);

  if (!form) {
    return (
      <div className="px-6 md:px-16 py-24 md:py-32 max-w-lg mx-auto text-center">
        <p className="font-display text-xl font-bold mb-3">Form not found</p>
        <p className="text-black/60 dark:text-white/60 mb-8">
          It may have been deleted. Head back to see your other forms.
        </p>
        <a href="/form-builder" className="btn-secondary">
          ← Back to your forms
        </a>
      </div>
    );
  }

  const host = headers().get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const publicUrl = `${protocol}://${host}/form-builder/apply/${params.id}`;

  return <FormBuilder initialForm={form} publicUrl={publicUrl} currentUser={session.user} formId={params.id} />;
}
