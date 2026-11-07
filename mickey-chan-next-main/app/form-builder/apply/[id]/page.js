import { kvGet } from "@/lib/kv";
import ApplyForm from "@/components/form-builder/ApplyForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Apply — Mickey Chan" };

export default async function ApplyPage({ params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);

  if (!form) {
    return (
      <main className="px-6 md:px-16 py-24 md:py-32 max-w-lg mx-auto text-center">
        <p className="font-display text-xl font-bold mb-3">This application form is no longer available.</p>
        <a href="/positions" className="btn-secondary">
          ← Back to open positions
        </a>
      </main>
    );
  }

  return (
    <main className="px-6 md:px-16 py-16 md:py-24">
      <ApplyForm form={form} formId={params.id} />
    </main>
  );
}
