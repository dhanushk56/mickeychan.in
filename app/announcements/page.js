import { unstable_noStore as noStore } from "next/cache";
import { kvGet } from "@/lib/kv";
import { ANNOUNCEMENTS_KEY, readAnnouncements } from "@/lib/announcements";
import AnnouncementExplorer from "@/components/announcements/AnnouncementExplorer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Announcements",
  description: "What's happening right now, and everything posted before, from the Mickey Chan team.",
  alternates: { canonical: "/announcements" },
};

export default async function AnnouncementsPage() {
  noStore();

  const list = readAnnouncements(await kvGet(ANNOUNCEMENTS_KEY, []));
  const now = Date.now();

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-9">
          <p className="kicker">Announcements</p>
          <h1 className="display-lg mt-3 mb-4">What&apos;s happening.</h1>
          <p className="muted text-lg leading-relaxed">
            Everything the team has posted, newest first. A notice stays live for as long as it was
            set to, then moves to past announcements. Pinned ones sit on top, and priority or
            emergency notices outrank standard ones while they run.
          </p>
        </div>

        <AnnouncementExplorer announcements={list} now={now} />
      </div>
    </main>
  );
}
