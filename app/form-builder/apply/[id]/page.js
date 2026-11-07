import Link from "next/link";
import { kvGet } from "@/lib/kv";
import ApplyForm from "@/components/form-builder/ApplyForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Apply" };

export default async function ApplyPage({ params }) {
  const form = await kvGet(`formbuilder:form:${params.id}`, null);

  if (!form) {
    return (
      <div className="page">
        <div className="shell" style={{ maxWidth: "34rem" }}>
          <div className="glass-card p-8 text-center">
            <p className="kicker justify-center">Closed</p>
            <p className="font-display text-xl font-bold mt-3 mb-3">This application is no longer available.</p>
            <p className="muted text-sm mb-6">
              The form may have been removed. Take a look at the other open positions.
            </p>
            <Link href="/positions" className="btn btn-secondary">
              ← Back to open positions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "46rem" }}>
        <div className="mb-6">
          <Link href="/positions" className="btn btn-ghost -ml-2">
            ← Open positions
          </Link>
        </div>
        <ApplyForm form={form} formId={params.id} />
      </div>
    </div>
  );
}
