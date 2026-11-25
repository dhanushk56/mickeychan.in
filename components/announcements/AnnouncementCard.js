import RichText from "@/components/RichText";
import LocalTime from "@/components/LocalTime";
import { categoryMeta, expiryTime, levelMeta, timeLeftMs } from "@/lib/announcements";

function formatLeft(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function hoursLabel(hours) {
  if (!Number.isFinite(hours)) return "";
  if (hours === 1) return "1 hour";
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${hours} hours (${days} day${days === 1 ? "" : "s"})`;
  }
  return `${hours} hours`;
}

// The one announcement card. The public page and the admin preview both render
// this, so a notice looks the same wherever it is shown.
export default function AnnouncementCard({ announcement, past = false, now = Date.now() }) {
  const meta = levelMeta(announcement.level);
  const category = categoryMeta(announcement.category);
  const left = timeLeftMs(announcement, now);
  const hours = announcement.windowHours;
  const hasEnd = expiryTime(announcement) != null;

  return (
    <article className="glass-card announcement-card" data-level={announcement.level}>
      {announcement.image && (
        <div className="announcement-image">
          <img src={announcement.image} alt="" loading="lazy" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
        <span className="badge badge-neutral">{category.label}</span>
        {announcement.pinned && <span className="badge badge-accepted">Pinned</span>}
        {past && <span className="badge badge-neutral">Past</span>}
      </div>

      <h3 className="font-display text-lg font-bold mt-3">{announcement.title}</h3>
      <RichText value={announcement.body} className="muted leading-relaxed mt-2" />

      <p className="muted text-xs mt-3">
        Posted <LocalTime iso={announcement.createdAt} />
        {left != null && <> · moves to past in {formatLeft(left)}</>}
        {past && Number.isFinite(hours) && <> · was current for {hoursLabel(hours)}</>}
        {!past && !hasEnd && <> · no time limit set</>}
      </p>
    </article>
  );
}
