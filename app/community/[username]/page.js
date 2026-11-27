import Link from "next/link";
import { notFound } from "next/navigation";
import { findMember } from "@/lib/members";
import { readProfileSettings } from "@/lib/profile";
import { ideaStatusMeta, listIdeas, rankIdeas } from "@/lib/ideas";

export const dynamic = "force-dynamic";

// A public profile is opt-in: it only exists while the member has switched it on
// in account settings, and it never shows an email address or phone number.
function handleOf(value) {
  return String(value || "").trim().toLowerCase();
}

function joinedLabel(member) {
  const at = new Date(member?.createdAt || "");
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

async function loadProfile(rawHandle) {
  const handle = handleOf(rawHandle);
  if (!handle) return null;
  const member = await findMember(handle);
  if (!member) return null;
  const settings = await readProfileSettings(handle);
  if (!settings.profileVisible) return null;
  return { member, settings };
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "Profile not found" };
  const name = profile.member.name || profile.member.username;
  return {
    title: `${name} (@${profile.member.username})`,
    description: `${name}'s public profile on MickeyChan.in: the ideas they posted and backed.`,
    alternates: { canonical: `/community/${profile.member.username}` },
  };
}

export default async function CommunityProfilePage({ params }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const { member } = profile;
  const name = member.name || member.username;
  const joined = joinedLabel(member);

  const ideas = await listIdeas();
  const posted = rankIdeas(ideas.filter((idea) => idea.author === member.username));
  const backed = ideas.filter(
    (idea) => Array.isArray(idea.votes) && idea.votes.includes(member.username)
  ).length;

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <Link href="/hub" className="faint text-xs hover:underline">
          ← Back to hub
        </Link>

        <header className="glass-card community-head">
          <span className="avatar-frame" aria-hidden="true">
            {member.avatar ? <img src={member.avatar} alt="" loading="lazy" decoding="async" /> : member.initials || name.slice(0, 2)}
          </span>
          <div className="community-id">
            <p className="kicker">Member</p>
            <h1 className="display-lg">{name}</h1>
            <p className="muted text-sm">@{member.username}</p>
            {joined && <p className="faint text-xs">Member since {joined}</p>}
          </div>
        </header>

        <div className="panel-stats profile-stats">
          <div className="panel-stat">
            <span className="panel-stat-value">{posted.length}</span>
            <span className="panel-stat-label">Ideas posted</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat-value">{backed}</span>
            <span className="panel-stat-label">Ideas backed</span>
          </div>
        </div>

        <section className="glass-card panel-card">
          <div className="panel-card-head">
            <h2 className="font-display font-bold">Ideas from {name}</h2>
            <Link href="/ideas" className="btn btn-secondary btn-sm">
              Idea board
            </Link>
          </div>

          {posted.length === 0 ? (
            <p className="muted text-sm">
              {name} hasn&apos;t posted an idea yet. Profiles are opt-in and show only what the
              member has chosen to publish.
            </p>
          ) : (
            <ul className="panel-list">
              {posted.map((idea) => {
                const meta = ideaStatusMeta(idea.status);
                return (
                  <li key={idea.id} className="panel-item">
                    <div className="panel-item-head">
                      <span className="font-semibold">{idea.title}</span>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <p className="faint text-xs">
                      {idea.votes.length} {idea.votes.length === 1 ? "backer" : "backers"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
