import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { kvGet } from "@/lib/kv";
import { getVideos } from "@/lib/content";
import { findMember, memberFromCookieStore, publicProfile } from "@/lib/members";
import { listSubmissions, memberSubmission, statusMeta } from "@/lib/applications";
import { readLibrary, referencedVideoIds } from "@/lib/library";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

function videoCard(video, id) {
  if (!video) {
    return { id, title: "Video unavailable", thumbnail: "", type: "video", channelLabel: "", views: "" };
  }
  return {
    id,
    title: video.title,
    thumbnail: video.thumbnail,
    type: video.type === "short" ? "short" : "video",
    channelLabel: video.channelLabel || "",
    views: video.views || "",
  };
}

async function myApplications(username) {
  const index = await kvGet("formbuilder:index", []);
  const forms = Array.isArray(index) ? index : [];
  const found = await Promise.all(
    forms.map(async (entry) => {
      const form = (await kvGet(`formbuilder:form:${entry.id}`, null)) || entry;
      const submission = memberSubmission(await listSubmissions(entry.id), username);
      if (!submission) return null;
      const meta = statusMeta(submission.status);
      return {
        id: entry.id,
        title: form?.title || entry?.title || "Application",
        status: meta.label,
        badge: meta.badge,
        note: meta.applicant,
        at: submission.createdAt || null,
        reviewedAt: submission.reviewedAt || null,
        href: `/form-builder/apply/${entry.id}`,
      };
    })
  );
  return found.filter(Boolean).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

export default async function DashboardPage({ searchParams }) {
  const session = await memberFromCookieStore(cookies());
  if (!session) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  const member = await findMember(session.username);
  if (!member) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);

  const params = await searchParams;
  const [library, videos, applications] = await Promise.all([
    readLibrary(session.username),
    getVideos(),
    myApplications(session.username),
  ]);

  const byId = new Map(videos.map((video) => [video.id, video]));
  const videosById = {};
  for (const id of referencedVideoIds(library)) {
    videosById[id] = videoCard(byId.get(id), id);
  }

  const tab = typeof params?.tab === "string" ? params.tab : "overview";

  return (
    <main className="page">
      <div className="shell">
        <DashboardShell
          profile={publicProfile(member)}
          initialLibrary={library}
          videosById={videosById}
          applications={applications}
          initialTab={tab}
        />
      </div>
    </main>
  );
}
