import { jobSummary } from "@/lib/applications";

// Department / location / commitment / deadline, rendered the same on a role
// card and on the application page.
export default function JobMeta({ form }) {
  const rows = jobSummary(form);
  if (!rows.length) return null;

  return (
    <dl className="job-meta">
      {rows.map((row) => (
        <div key={row.label} className="job-meta-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
