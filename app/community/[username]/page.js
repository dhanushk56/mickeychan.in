import Link from "next/link";
import { notFound } from "next/navigation";
import { findMember } from "@/lib/members";
import { readSettings, getPlaylist, listPlaylists } from "@/lib/library";
import { getVideos } from "@/lib/content";

export const dynamic = "force-dynamic";

// A public profile is opt-in: it only exists while the member has switched it on
// in their dashboard, and it never shows an email address or phone number.
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
  const settings = await readSettings(handle);
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
    description: `${name}'s public profile on MickeyChan.in — public playlists and community details.`,
    alternates: { canonical: `/community/${profile.member.username}` },
  };
}

export default async function CommunityProfilePage({ params }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const { member, settings } = profile;
  const name = member.name || member.username;
  const joined = joinedLabel(member);

  let playlists = [];
  if (settings.publicPlaylists) {
    const summaries = await listPlaylists(member.username);
    const docs = await Promise.all(
      summaries.filter((entry) => entry.public).map((entry) => getPlaylist(member.username, entry.id))
    );
    playlists = docs.filter((doc) => doc && doc.public);
  }

  const badges = [];
  if (playlists.length >= 1) badges.push("Shared a playlist");
  if (playlists.length >= 3) badges.push("Curator");

  const videos = playlists.length > 0 ? await getVideos() : [];
  const byId = new Map(videos.map((video) => [video.id, video]));

  return (
    <main className="page">
      <div className="shell">
        <Link href="/videos" className="faint text-xs hover:underline">
          ← Back to the site
        </Link>

        <header className="glass-card community-head">
          <span className="avatar-frame" aria-hidden="true">
            {member.avatar ? <img src={member.avatar} alt="" /> : (member.initials || name.slice(0, 2))}
          </span>
          <div className="community-id">
            <p className="kicker">Community</p>
            <h1 className="display-lg">{name}</h1>
            <p className="muted text-sm">@{member.username}</p>
            {joined && <p className="faint text-xs">Member since {joined}</p>}
            {badges.length > 0 && (
              <ul className="community-badges">
                {badges.map((badge) => (
                  <li key={badge} className="badge badge-accepted">
                    {badge}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <section className="glass-card community-card">
          <div className="dash-card-head">
            <h2 className="font-display font-bold">Public playlists</h2>
            <span className="badge badge-neutral">{playlists.length}</span>
          </div>

          {!settings.publicPlaylists || playlists.length === 0 ? (
            <p className="muted text-sm">
              {name} hasn&apos;t shared a playlist yet. Profiles are opt-in and only show what
              the member chooses to publish.
            </p>
          ) : (
            <div className="community-playlists">
              {playlists.map((playlist) => (
                <article key={playlist.id} className="community-playlist">
                  <h3 className="font-semibold">{playlist.name}</h3>
                  <p className="faint text-xs">
                    {playlist.items.length} {playlist.items.length === 1 ? "video" : "videos"}
                  </p>
                  <ul className="dash-list">
                    {playlist.items.slice(0, 8).map((videoId) => {
                      const video = byId.get(videoId);
                      return (
                        <li key={videoId} className="dash-video">
                          <Link href={`/videos/${videoId}`} className="dash-video-main">
                            <span
                              className="dash-video-thumb"
                              data-short={video?.type === "short"}
                              style={video?.thumbnail ? { backgroundImage: `url(${video.thumbnail})` } : undefined}
                              aria-hidden="true"
                            />
                            <span className="dash-video-text">
                              <span className="dash-video-title">{video?.title || "Video"}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
