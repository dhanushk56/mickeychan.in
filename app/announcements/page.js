import { unstable_noStore as noStore } from "next/cache";
import { kvGet } from "@/lib/kv";
import {
  ANNOUNCEMENTS_KEY,
  levelMeta,
  readAnnouncements,
  splitAnnouncements,
  timeLeftMs,
} from "@/lib/announcements";
import RichText from "@/components/RichText";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Announcements",
  description: "What's happening right now, and everything posted before — from the Mickey Chan team.",
};

function formatLeft(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function AnnouncementCard({ announcement, past = false }) {
  const meta = levelMeta(announcement.level);
  const left = timeLeftMs(announcement);

  return (
    <article className="glass-card announcement-card" data-level={announcement.level}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
        <span className="faint text-xs">
          Posted <LocalTime iso={announcement.createdAt} />
        </span>
        {announcement.level === "normal" && left != null && !past && (
          <span className="faint text-xs">· current for another {formatLeft(left)}</span>
        )}
        {announcement.level !== "normal" && (
          <span className="faint text-xs">· stays until the team removes it</span>
        )}
      </div>
      <h3 className="font-display text-lg font-bold mt-3">{announcement.title}</h3>
      <RichText value={announcement.body} className="muted leading-relaxed mt-2" />
    </article>
  );
}

export default async function AnnouncementsPage() {
  // Same reasoning as /positions: the current/past split is about right now, so
  // this page must never come from a cached render.
  noStore();

  const list = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  const { current, past } = splitAnnouncements(list, Date.now());

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-9">
          <p className="kicker">Announcements</p>
          <h1 className="display-lg mt-3 mb-4">What&apos;s happening.</h1>
          <p className="muted text-lg leading-relaxed">
            Everything the team has posted, newest first. Announcements stay current for 24 hours —
            or for however long they were set to run — while priority and emergency notices stay at
            the top until they&apos;re taken down.
          </p>
        </div>

        <section className="grid gap-3" aria-labelledby="current-announcements">
          <div className="flex items-center justify-between gap-3">
            <h2 id="current-announcements" className="font-display text-xl font-bold">
              Current
            </h2>
            <span className="badge badge-neutral">
              {current.length} {current.length === 1 ? "notice" : "notices"}
            </span>
          </div>

          {current.length === 0 ? (
            <div className="empty-state">
              <p className="font-display font-bold">Nothing current right now</p>
              <p className="muted text-sm max-w-md">
                When the team posts something, it shows up here first — and stays for 24 hours.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {current.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 mt-12" aria-labelledby="past-announcements">
          <div className="flex items-center justify-between gap-3">
            <h2 id="past-announcements" className="font-display text-xl font-bold">
              Past announcements
            </h2>
            <span className="badge badge-neutral">
              {past.length} {past.length === 1 ? "notice" : "notices"}
            </span>
          </div>

          {past.length === 0 ? (
            <div className="empty-state">
              <p className="font-display font-bold">Nothing archived yet</p>
              <p className="muted text-sm max-w-md">
                Once an announcement&apos;s window ends it moves down here and stays readable.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {past.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} past />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
