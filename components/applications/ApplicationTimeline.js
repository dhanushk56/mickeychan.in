import LocalTime from "@/components/LocalTime";
import { statusMeta, submissionTimeline } from "@/lib/applications";

// The applicant-facing stages of one application, oldest first. Admin updates
// append events here, so this is the same history the reviewer sees.
export default function ApplicationTimeline({ submission }) {
  const events = submissionTimeline(submission);
  if (!events.length) return null;

  return (
    <ol className="timeline">
      {events.map((event, index) => {
        const meta = statusMeta(event.status);
        return (
          <li key={`${event.at}-${index}`} className="timeline-item">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${meta.badge}`}>{meta.label}</span>
              <span className="faint text-xs">
                <LocalTime iso={event.at} />
                {event.by ? ` · ${event.by}` : ""}
              </span>
            </div>
            {event.note && <p className="muted text-sm whitespace-pre-wrap mt-1">{event.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
