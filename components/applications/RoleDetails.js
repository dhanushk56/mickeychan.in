import { jobLines, jobMeta } from "@/lib/applications";
import JobMeta from "@/components/applications/JobMeta";

// The full role brief: metadata, what the role involves, and what it needs.
// Every part is optional, so an older form shows nothing here.
export default function RoleDetails({ form, title = "About the role" }) {
  const job = jobMeta(form);
  const responsibilities = jobLines(job.responsibilities);
  const requirements = jobLines(job.requirements);
  const hasMeta = Object.values(job).some(Boolean);

  if (!hasMeta && !responsibilities.length && !requirements.length) return null;

  return (
    <section className="glass-card p-5 grid gap-3">
      <p className="font-semibold text-sm">{title}</p>
      <JobMeta form={form} />
      {responsibilities.length > 0 && (
        <div className="grid gap-1">
          <p className="field-label">What you&apos;d do</p>
          <ul className="role-list">
            {responsibilities.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {requirements.length > 0 && (
        <div className="grid gap-1">
          <p className="field-label">What we&apos;re looking for</p>
          <ul className="role-list">
            {requirements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
