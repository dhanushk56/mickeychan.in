import Link from "next/link";
import { getChannelSubscribers, getVideos, channelUrl } from "@/lib/content";
import { kvGet } from "@/lib/kv";
import { socials } from "@/data/socials";
import SocialIcon from "@/components/SocialIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function shortName(social) {
  return social.short || social.name.split(" (")[0];
}

function VideoMini({ video }) {
  return (
    <Link href={`/videos?v=${video.id}`} className="glass-card lift overflow-hidden flex flex-col">
      <div
        className="video-thumb"
        style={{ backgroundImage: `url(${video.thumbnail})` }}
        data-short={video.type === "short"}
      >
        <span className="play-badge" aria-hidden="true">▶</span>
        {video.duration && <span className="thumb-badge">{video.duration}</span>}
        <span className="thumb-pill">{video.type === "short" ? "Short" : "Video"}</span>
      </div>
      <div className="video-body">
        <p className="video-title">{video.title}</p>
        <p className="faint text-xs mt-1.5">
          {[video.views && `${video.views} views`, video.published].filter(Boolean).join(" · ") || "On YouTube"}
        </p>
      </div>
    </Link>
  );
}

function ShortCard({ video }) {
  return (
    <Link href={`/videos?v=${video.id}`} className="glass-card lift video-card">
      <div
        className="video-thumb"
        data-short="true"
        style={{ backgroundImage: `url(${video.thumbnail})` }}
      >
        <span className="play-badge" aria-hidden="true">▶</span>
        <span className="thumb-pill">Short</span>
        {video.views && <span className="thumb-badge">{video.views}</span>}
      </div>
      <div className="video-body">
        <p className="video-title">{video.title}</p>
      </div>
    </Link>
  );
}

const QUESTIONS = [
  {
    q: "Where do I watch the full videos?",
    a: "Every upload lives on the videos page and plays right here — no redirect to YouTube unless you want one. The channel archive is also on @mickeychaan.",
  },
  {
    q: "How do I apply for a role?",
    a: "Open the positions page, pick a listing, and fill in the short application. It lands in the review queue immediately, and every answer is read.",
  },
  {
    q: "Can I send a collab or sponsorship idea?",
    a: "Yes. Use the contact form for collabs, community questions, or a hello, and business@mickeychan.in for sponsorship and brand work.",
  },
  {
    q: "Do shorts get their own feed?",
    a: "Shorts are mixed into the videos library with a Shorts filter. They are the quick ones — guessing games, edits, and clips pulled straight from streams.",
  },
];

export default async function Home() {
  const [videos, forms, channelStats] = await Promise.all([
    getVideos(),
    kvGet("formbuilder:index", []),
    getChannelSubscribers(),
  ]);

  const longForm = videos.filter((video) => video.type !== "short");
  const shorts = videos.filter((video) => video.type === "short");
  const latest = videos.slice(0, 3);
  const shortsStrip = shorts.slice(0, 5);
  const openRoles = forms.filter((form) => form.published !== false);
  const hero = videos[0];

  return (
    <>
      <section className="px-6 md:px-16 pt-10 md:pt-16 pb-16">
        <div className="shell grid gap-10 lg:grid-cols-[1.15fr_.85fr] items-center">
          <div className="animate-rise">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Gamer · Streamer · Storyteller
            </span>

            <h1 className="display-xl mt-6 mb-6">
              Play boldly.
              <br />
              <span className="gradient-text">Tell better stories.</span>
            </h1>

            <p className="muted text-lg md:text-xl max-w-xl leading-relaxed mb-9">
              Welcome to Mickey Chan&apos;s world of games, streams, and stories. Catch the latest
              uploads, find every social, and join the community.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/videos" className="btn btn-primary">
                Explore videos <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/join" className="btn btn-secondary">
                Join the community
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-6">
              <span className="faint text-xs font-bold" style={{ letterSpacing: ".14em", textTransform: "uppercase" }}>
                Elsewhere
              </span>
              {socials.slice(0, 4).map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={social.href.startsWith("mailto:") ? undefined : "noreferrer"}
                  className="chip"
                >
                  <SocialIcon name={social.icon} className="w-3.5 h-3.5" />
                  {shortName(social)}
                </a>
              ))}
            </div>

            <div className="stat-grid mt-10 max-w-xl">
              <div className="stat">
                <p className="stat-value">{longForm.length}</p>
                <p className="stat-label">Videos live</p>
              </div>
              <div className="stat">
                <p className="stat-value">{shorts.length}</p>
                <p className="stat-label">Shorts</p>
              </div>
              <div className="stat">
                <p className="stat-value">{openRoles.length}</p>
                <p className="stat-label">Open roles</p>
              </div>
            </div>
          </div>

          {hero && (
            <div className="animate-rise delay-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="kicker">Latest upload</p>
                <span className="badge badge-neutral">
                  {[hero.published, hero.views && `${hero.views} views`].filter(Boolean).join(" · ") || "New"}
                </span>
              </div>
              <Link href={`/videos?v=${hero.id}`} className="glass-card lift block overflow-hidden">
                <div
                  className="video-thumb"
                  style={{ backgroundImage: `url(${hero.thumbnail})`, aspectRatio: "16 / 10" }}
                >
                  <span className="play-badge" style={{ opacity: 1 }} aria-hidden="true">▶</span>
                  {hero.duration && <span className="thumb-badge">{hero.duration}</span>}
                  <span className="thumb-pill">New</span>
                </div>
                <div className="p-5">
                  <p className="font-display text-lg font-bold leading-snug">{hero.title}</p>
                  <p className="faint text-sm mt-2">
                    {[hero.views && `${hero.views} views`, hero.published].filter(Boolean).join(" · ") || "Watch now"}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                      Watch on the channel ↗
                    </span>
                    <span className="badge badge-neutral">YouTube</span>
                  </div>
                </div>
              </Link>
              <a
                href={channelUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary w-full mt-3"
              >
                Open the channel ↗
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 md:px-16 pb-16">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="kicker">On YouTube</p>
              <h2 className="display-lg mt-2">Two channels, one audience.</h2>
            </div>
            <p className="faint text-xs max-w-xs">
              Subscriber counts refresh a few times a day.
            </p>
          </div>

          <div className="channel-stats">
            {channelStats.map((channel) => (
              <a
                key={channel.id}
                href={channel.url}
                target="_blank"
                rel="noreferrer"
                className="sub-card lift"
                title={`${channel.label} on YouTube`}
              >
                <span className="sub-label">{channel.label}</span>
                <span className="sub-count">
                  {channel.subscribers || "—"}
                  {channel.subscribers && (
                    <span className="sub-plus" aria-hidden="true">
                      +
                    </span>
                  )}
                </span>
                <span className="sub-handle">@{channel.handle} ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-16 pb-16">
        <div className="shell">
          <div className="max-w-2xl mb-8">
            <p className="kicker">Inside the channel</p>
            <h2 className="display-lg mt-2 mb-3">Three kinds of chaos, one channel.</h2>
            <p className="muted leading-relaxed">
              Long-form episodes built around one ridiculous rule, shorts made for a quick scroll,
              and SMP stories that keep going long after the episode ends.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                glyph: "▶",
                title: "Long-form challenges",
                body: "One rule, one goal, and thirty minutes of things going sideways — random teleports, blind runs, and servers that were not built for this.",
                meta: [`${longForm.length} videos`, "13–30 min", "Weekly-ish"],
                href: "/videos",
                cta: "Watch the episodes",
              },
              {
                glyph: "✦",
                title: "Shorts & guessing games",
                body: "Guess the YouTuber, guess the block, guess the word. Quick clips cut from streams and episodes, some of them good for a million views.",
                meta: [`${shorts.length} clips`, "Under a minute", "New often"],
                href: "/videos",
                cta: "Scroll the shorts",
              },
              {
                glyph: "◎",
                title: "SMP stories",
                body: "Girls SMP, Titan Only, haunted servers and unbanning players — the long-running worlds where the community actually lives.",
                meta: ["Community servers", "Collabs", "Story arcs"],
                href: "/videos",
                cta: "Follow the story",
              },
            ].map((card) => (
              <div key={card.title} className="glass-card p-6 flex flex-col">
                <span className="glass-inset icon-button mb-5" aria-hidden="true">{card.glyph}</span>
                <h3 className="font-display text-lg font-bold mb-2">{card.title}</h3>
                <p className="muted text-sm leading-relaxed flex-1">{card.body}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {card.meta.map((item) => (
                    <span key={item} className="badge badge-neutral">{item}</span>
                  ))}
                </div>
                <Link href={card.href} className="mt-5 text-xs font-bold" style={{ color: "var(--primary)" }}>
                  {card.cta} ↗
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {latest.length > 0 && (
        <section className="px-6 md:px-16 pb-16">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">From the channel</p>
                <h2 className="display-lg mt-2">Fresh out of the recording booth.</h2>
              </div>
              <Link href="/videos" className="btn btn-secondary btn-sm">
                All videos ↗
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((video) => (
                <VideoMini key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {shortsStrip.length > 0 && (
        <section className="px-6 md:px-16 pb-16">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">Quick hits</p>
                <h2 className="display-lg mt-2">Shorts worth a scroll.</h2>
              </div>
              <Link href="/videos" className="btn btn-secondary btn-sm">
                All shorts ↗
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {shortsStrip.map((video) => (
                <ShortCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 md:px-16 pb-16">
        <div className="shell grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="glass-card p-7 md:p-10">
            <span className="eyebrow">The creator</span>
            <h2 className="display-lg mt-4 mb-4">Minecraft, but make it a story.</h2>
            <p className="muted leading-relaxed mb-3">
              Mickey Chan makes Minecraft videos that start with a simple question and end
              somewhere ridiculous — testing clickbait ideas, surviving cursed servers, and
              turning one small rule into a whole episode.
            </p>
            <p className="muted leading-relaxed">
              Around the episodes there is the rest of it: shorts cut from the funniest moments,
              collabs with friends across the community, and a team made up of editors, builders,
              and moderators who keep the worlds running. New ideas are always welcome — the
              contact form is open.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-6">
              {["Minecraft", "Challenges", "SMPs", "Shorts", "Collabs", "Community"].map((tag) => (
                <span key={tag} className="chip">{tag}</span>
              ))}
            </div>
          </div>

          <div className="glass-card p-7">
            <p className="kicker mb-4">Fast facts</p>
            <dl className="fact-list">
              {[
                ["Focus", "Minecraft challenges & SMPs"],
                ["Formats", "Long-form + shorts"],
                ["Collabs", "Mitsuha Gaming · Niz Unfiltered"],
                ["Team", openRoles.length > 0 ? `${openRoles.length} open role${openRoles.length === 1 ? "" : "s"}` : "Open to good people"],
                ["Business", "business@mickeychan.in"],
              ].map(([label, value]) => (
                <div className="fact-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/join" className="btn btn-secondary w-full mt-5">
              Get in touch <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-16 pb-16">
        <div className="shell">
          <div className="section-head">
            <div>
              <p className="kicker">Find me elsewhere</p>
              <h2 className="display-lg mt-2">Every place the community lives.</h2>
            </div>
            <Link href="/socials" className="btn btn-secondary btn-sm">
              All socials ↗
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={social.href.startsWith("mailto:") ? undefined : "noreferrer"}
                className="glass-card lift p-5 flex items-center justify-between gap-4"
              >
                <span className="flex items-center gap-4 min-w-0">
                  <span className="glass-inset icon-button flex-shrink-0">
                    <SocialIcon name={social.icon} className="w-4 h-4" />
                  </span>
                  <span className="font-display text-base font-bold truncate">{social.name}</span>
                </span>
                <span className="faint text-lg flex-shrink-0" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-16 pb-16">
        <div className="shell">
          <div className="glass-card p-7 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="kicker">Join the team</p>
                <h2 className="display-lg mt-2">
                  {openRoles.length > 0 ? "We're hiring right now." : "No open roles — yet."}
                </h2>
              </div>
              <Link href="/positions" className="btn btn-secondary btn-sm">
                All positions ↗
              </Link>
            </div>

            {openRoles.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {openRoles.slice(0, 4).map((role) => (
                  <Link
                    key={role.id}
                    href={`/form-builder/apply/${role.id}`}
                    className="glass-soft lift p-5 flex items-center justify-between gap-4"
                  >
                    <span className="min-w-0">
                      <span className="font-display font-bold block truncate">
                        {role.title || "Untitled role"}
                      </span>
                      <span className="faint text-xs">
                        {role.createdAt ? `Posted ${new Date(role.createdAt).toLocaleDateString()}` : "Open now"}
                      </span>
                    </span>
                    <span className="icon-button flex-shrink-0" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted text-sm max-w-xl leading-relaxed">
                Roles appear here the moment they are published in the form builder. Nothing open
                today? Send a message anyway and say what you would bring to the channel.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-16 pb-16">
        <div className="shell grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="kicker">Good to know</p>
            <h2 className="display-lg mt-2 mb-3">Questions that come up a lot.</h2>
            <p className="muted text-sm leading-relaxed max-w-sm">
              Short answers to the things people ask most. Anything not covered here is a message
              away.
            </p>
          </div>
          <div className="grid gap-3">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-16 pb-20">
        <div className="shell">
          <div className="glass-card p-8 md:p-12 text-center">
            <p className="kicker justify-center">Collaborations &amp; community</p>
            <h2 className="display-lg mt-3 mb-4">Have something in mind?</h2>
            <p className="muted max-w-xl mx-auto mb-8 leading-relaxed">
              Sponsorships, collabs, editing help, or just a hello — send a message and it lands
              straight in the inbox.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/join" className="btn btn-primary">
                Start a conversation <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/positions" className="btn btn-secondary">
                Open positions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
