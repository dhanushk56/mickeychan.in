import { jobMeta } from "@/lib/applications";
import JobMeta from "@/components/applications/JobMeta";
import RichText from "@/components/RichText";

// The full role brief: metadata, what the role involves, and what it needs.
// Every part is optional, so an older form shows nothing here.
export default function RoleDetails({ form, title = "About the role" }) {
  const job = jobMeta(form);
  const responsibilities = job.responsibilities;
  const requirements = job.requirements;
  const hasMeta = ["department", "location", "commitment", "availability", "deadline"].some(
    (key) => Boolean(job[key])
  );

  if (!hasMeta && responsibilities.length === 0 && requirements.length === 0) return null;

  return (
    <section className="glass-card p-5 grid gap-3">
      <p className="font-semibold text-sm">{title}</p>
      <JobMeta form={form} />
      {responsibilities.length > 0 && (
        <div className="grid gap-1">
          <p className="field-label">What you&apos;d do</p>
          <RichText value={responsibilities} className="role-text" />
        </div>
      )}
      {requirements.length > 0 && (
        <div className="grid gap-1">
          <p className="field-label">What we&apos;re looking for</p>
          <RichText value={requirements} className="role-text" />
        </div>
      )}
    </section>
  );
}
