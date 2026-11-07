import { kvGet } from "@/lib/kv";
import { emptyForm } from "@/lib/form-builder/schema";
import ApplyForm from "@/components/form-builder/ApplyForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Apply — Mickey Chan" };

export default async function ApplyPage() {
  const form = await kvGet("formbuilder:schema", emptyForm());
  return (
    <main className="px-6 md:px-16 py-16 md:py-24">
      <ApplyForm form={form} />
    </main>
  );
}
