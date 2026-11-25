import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { kvGet } from "@/lib/kv";
import { findMember, memberFromCookieStore, publicProfile } from "@/lib/members";
import { listSubmissions, memberSubmission, statusMeta } from "@/lib/applications";
import { readProfileSettings } from "@/lib/profile";
import { listIdeas } from "@/lib/ideas";
import { buildAchievements } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

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
  const [profileSettings, ideas, applications] = await Promise.all([
    readProfileSettings(session.username),
    listIdeas(),
    myApplications(session.username),
  ]);

  const myIdeas = ideas
    .filter((idea) => idea.author === session.username)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      status: idea.status,
      backers: Array.isArray(idea.votes) ? idea.votes.length : 0,
      createdAt: idea.createdAt,
    }));

  const stats = {
    applications: applications.length,
    ideasPosted: myIdeas.length,
    ideasBacked: ideas.filter(
      (idea) => Array.isArray(idea.votes) && idea.votes.includes(session.username)
    ).length,
  };

  const achievements = buildAchievements({
    applications,
    ideas,
    profileVisible: profileSettings.profileVisible,
    username: session.username,
  });

  const tab = typeof params?.tab === "string" ? params.tab : "overview";

  return (
    <main className="page">
      <div className="shell">
        <DashboardShell
          profile={publicProfile(member)}
          applications={applications}
          myIdeas={myIdeas}
          stats={stats}
          achievements={achievements}
          profileVisible={profileSettings.profileVisible}
          initialTab={tab}
        />
      </div>
    </main>
  );
}
