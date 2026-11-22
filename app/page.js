import Link from "next/link";
import { channels, getChannelSubscribers, getVideos } from "@/lib/content";
import { kvGet } from "@/lib/kv";
import { socials } from "@/data/socials";
import SocialIcon from "@/components/SocialIcon";
import HomeMotion from "@/components/HomeMotion";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MARQUEE = ["Challenges", "Shorts", "ARGs", "Collabs", "Storylines", "Community"];

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

function shortName(social) {
  return social.short || social.name.split(" (")[0];
}

function channelName(channel) {
  const handle = String(channel.handle || "").toLowerCase();
  const social = socials.find((entry) =>
    String(entry.href || "").toLowerCase().endsWith(`/@${handle}`)
  );
  return social ? shortName(social) : channel.label;
}

function videoMeta(video) {
  return [video.views && `${video.views} views`, video.published].filter(Boolean).join(" · ") || "Watch now";
}

function Poster({ entry, order }) {
  const { channel, video } = entry;
  return (
    <Link href={`/videos?v=${video.id}`} className="home-poster" data-home-reveal>
      <div className="home-poster-media">
        <span
          className="home-poster-img"
          style={{ backgroundImage: `url(${video.thumbnail})` }}
          aria-hidden="true"
        />
        <span className="home-poster-index" aria-hidden="true">{order}</span>
        <span className="thumb-pill">{video.type === "short" ? "Short" : "New"}</span>
        {video.duration && <span className="thumb-badge">{video.duration}</span>}
        <span className="play-badge" aria-hidden="true">▶</span>
      </div>
      <div className="home-poster-body">
        <p className="home-poster-channel">{channelName(channel)}</p>
        <p className="home-poster-title">{video.title}</p>
        <p className="home-poster-meta">{videoMeta(video)}</p>
      </div>
    </Link>
  );
}

function VideoCard({ video }) {
  return (
    <Link href={`/videos?v=${video.id}`} className="home-card" data-home-reveal>
      <div className="home-thumb">
        <span
          className="home-thumb-img"
          style={{ backgroundImage: `url(${video.thumbnail})` }}
          aria-hidden="true"
        />
        <span className="play-badge" aria-hidden="true">▶</span>
        {video.duration && <span className="thumb-badge">{video.duration}</span>}
        <span className="thumb-pill">{video.type === "short" ? "Short" : "Video"}</span>
      </div>
      <div className="home-card-body">
        <p className="home-card-title">{video.title}</p>
        <p className="home-card-meta">{videoMeta(video)}</p>
      </div>
    </Link>
  );
}

function ShortCard({ video }) {
  return (
    <Link href={`/videos?v=${video.id}`} className="home-card" data-home-reveal>
      <div className="home-thumb" data-short="true">
        <span
          className="home-thumb-img"
          style={{ backgroundImage: `url(${video.thumbnail})` }}
          aria-hidden="true"
        />
        <span className="play-badge" aria-hidden="true">▶</span>
        <span className="thumb-pill">Short</span>
        {video.views && <span className="thumb-badge">{video.views}</span>}
      </div>
      <div className="home-card-body">
        <p className="home-card-title">{video.title}</p>
      </div>
    </Link>
  );
}

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
  const featured = longForm.slice(0, 2).map((video) => ({
    channel: channels.find((channel) => channel.id === video.channel) || channels[0],
    video,
  }));
  const heroChannels = new Set(featured.map((entry) => entry.channel.id));

  return (
    <div className="home">
      <HomeMotion />

      <section className="home-hero px-6 md:px-16">
        <div className="home-spotlight" aria-hidden="true" />
        <span className="home-ghost" aria-hidden="true">MICKEY CHAN</span>

        <div className="shell home-hero-inner">
          <div className="home-hero-copy">
            <span className="eyebrow home-in" style={{ "--d": "80ms" }}>
              <span className="eyebrow-dot" />
              Gamer · Streamer · Storyteller
            </span>

            <h1 className="home-title">
              <span className="home-line"><span>Play boldly.</span></span>
              <span className="home-line"><span className="gradient-text">Tell better stories.</span></span>
            </h1>

            <p className="home-lede home-in" style={{ "--d": "320ms" }}>
              Welcome to Mickey Chan&apos;s world of games, streams, and stories. Catch the latest
              uploads, find every social, and join the community.
            </p>

            <div className="home-actions home-in" style={{ "--d": "440ms" }}>
              <Link href="/videos" className="btn btn-primary">
                Explore videos <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/join" className="btn btn-secondary">
                Join the community
              </Link>
            </div>

            <div className="home-signature home-in" style={{ "--d": "560ms" }}>
              <span className="home-signature-label">Elsewhere</span>
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
          </div>

          {featured.length > 0 && (
            <div className="home-posters home-in" style={{ "--d": "300ms" }}>
              <div className="home-posters-head">
                <p className="kicker">Latest uploads</p>
                <span className="badge badge-neutral">
                  {heroChannels.size > 1 ? "Both channels" : channelName(featured[0].channel)}
                </span>
              </div>

              <div className="home-posters-grid">
                {featured.map((entry, index) => (
                  <Poster key={entry.video.id} entry={entry} order={`0${index + 1}`} />
                ))}
              </div>

              <div className="home-posters-foot">
                <Link href="/videos" className="home-text-link">
                  All videos ↗
                </Link>
                <a
                  href={featured[0].video.channelUrl || featured[0].channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="home-text-link"
                >
                  Open {channelName(featured[0].channel)} ↗
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="shell home-hero-foot">
          <a href="#latest" className="home-cue">
            Scroll to explore
            <span className="home-cue-line" aria-hidden="true" />
          </a>
          <a
            href={`https://www.youtube.com/@${channels[0].handle}`}
            target="_blank"
            rel="noreferrer"
            className="home-hero-live"
          >
            <span className="home-ping" aria-hidden="true" />
            New episodes on @{channels[0].handle}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          {[0, 1].map((copy) => (
            <div className="home-marquee-group" key={copy}>
              {MARQUEE.map((word) => (
                <span key={`${copy}-${word}`} className="home-marquee-item">
                  {word}
                  <i>✳</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="home-section px-6 md:px-16">
        <div className="shell">
          <div className="home-section-head">
            <div data-home-reveal>
              <p className="kicker">On YouTube</p>
              <h2 className="display-lg mt-2">Two channels, one audience.</h2>
            </div>
            <p className="faint text-xs max-w-xs" data-home-reveal>
              Subscriber counts refresh a few times a day.
            </p>
          </div>

          <div className="home-band">
            {channelStats.map((channel) => (
              <a
                key={channel.id}
                href={channel.url}
                target="_blank"
                rel="noreferrer"
                className="home-band-cell"
                data-home-reveal
                title={`${channel.label} on YouTube`}
              >
                <span className="home-band-label">Subscribers</span>
                <span className="home-count" data-count={channel.subscribers || "—"}>
                  {channel.subscribers || "—"}
                </span>
                <span className="home-band-sub">@{channel.handle} ↗</span>
              </a>
            ))}
            <div className="home-band-cell" data-home-reveal>
              <span className="home-band-label">Videos live</span>
              <span className="home-count" data-count={longForm.length}>{longForm.length}</span>
              <span className="home-band-sub">Long-form episodes</span>
            </div>
            <div className="home-band-cell" data-home-reveal>
              <span className="home-band-label">Shorts</span>
              <span className="home-count" data-count={shorts.length}>{shorts.length}</span>
              <span className="home-band-sub">Quick clips</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section px-6 md:px-16">
        <div className="shell">
          <div className="home-section-head">
            <div data-home-reveal>
              <p className="kicker">Inside the channel</p>
              <h2 className="display-lg mt-2">Three kinds of chaos, one channel.</h2>
            </div>
            <p className="muted text-sm max-w-sm leading-relaxed" data-home-reveal>
              Long-form episodes built around one ridiculous rule, shorts made for a quick scroll,
              and ARG stories that keep going long after the episode ends.
            </p>
          </div>

          <div className="home-lanes">
            {[
              {
                title: "Long-form challenges",
                body: "One rule, one goal, and thirty minutes of things going sideways — random teleports, blind runs, and servers that were not built for this.",
                meta: [`${longForm.length} videos`, "13–30 min", "Weekly-ish"],
                href: "/videos",
                cta: "Watch the episodes",
              },
              {
                title: "Shorts & guessing games",
                body: "Guess the YouTuber, guess the block, guess the word. Quick clips cut from streams and episodes, some of them good for a million views.",
                meta: [`${shorts.length} clips`, "Under a minute", "New often"],
                href: "/videos",
                cta: "Scroll the shorts",
              },
              {
                title: "ARG stories",
                body: "Hidden codes, cryptic clues and puzzles that spill off the screen — the storylines you piece together with everyone else watching.",
                meta: ["Hidden clues", "Puzzles", "Story arcs"],
                href: "/videos",
                cta: "Follow the story",
              },
            ].map((lane, index) => (
              <div className="home-lane" key={lane.title} data-home-reveal>
                <span className="home-lane-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="home-lane-body">
                  <h3 className="home-lane-title">{lane.title}</h3>
                  <p className="home-lane-copy">{lane.body}</p>
                </div>
                <div className="home-lane-meta">
                  {lane.meta.map((item) => (
                    <span key={item} className="badge badge-neutral">{item}</span>
                  ))}
                </div>
                <Link href={lane.href} className="home-lane-cta">
                  {lane.cta}
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {latest.length > 0 && (
        <section className="home-section px-6 md:px-16" id="latest">
          <div className="shell">
            <div className="home-section-head">
              <div data-home-reveal>
                <p className="kicker">From the channel</p>
                <h2 className="display-lg mt-2">Fresh out of the recording booth.</h2>
              </div>
              <Link href="/videos" className="btn btn-secondary btn-sm">
                All videos ↗
              </Link>
            </div>
            <div className="home-reel">
              {latest.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {shortsStrip.length > 0 && (
        <section className="home-section px-6 md:px-16">
          <div className="shell">
            <div className="home-section-head">
              <div data-home-reveal>
                <p className="kicker">Quick hits</p>
                <h2 className="display-lg mt-2">Shorts worth a scroll.</h2>
              </div>
              <Link href="/videos" className="btn btn-secondary btn-sm">
                All shorts ↗
              </Link>
            </div>
            <div className="home-rail">
              {shortsStrip.map((video) => (
                <ShortCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-section px-6 md:px-16">
        <div className="shell home-story">
          <div className="home-story-main" data-home-reveal>
            <span className="eyebrow">The creator</span>
            <h2 className="home-story-quote">Minecraft, but make it a story.</h2>
            <p className="muted leading-relaxed">
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
            <div className="home-tags">
              {["Minecraft", "Challenges", "ARGs", "Shorts", "Collabs", "Community"].map((tag) => (
                <span key={tag} className="chip">{tag}</span>
              ))}
            </div>
          </div>

          <aside className="home-facts glass-card" data-reveal="off" data-home-reveal>
            <p className="kicker">Fast facts</p>
            <dl className="fact-list">
              {[
                ["Focus", "Minecraft challenges & ARGs"],
                ["Formats", "Long-form + shorts"],
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
          </aside>
        </div>
      </section>

      <section className="home-section px-6 md:px-16">
        <div className="shell">
          <div className="home-section-head">
            <div data-home-reveal>
              <p className="kicker">Find me elsewhere</p>
              <h2 className="display-lg mt-2">Every place the community lives.</h2>
            </div>
            <Link href="/socials" className="btn btn-secondary btn-sm">
              All socials ↗
            </Link>
          </div>
          <div className="home-social-grid">
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={social.href.startsWith("mailto:") ? undefined : "noreferrer"}
                className="home-tile"
                data-home-reveal
              >
                <span className="home-tile-icon">
                  <SocialIcon name={social.icon} className="w-4 h-4" />
                </span>
                <span className="home-tile-name">{social.name}</span>
                <span className="home-tile-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section px-6 md:px-16">
        <div className="shell">
          <div className="home-roles glass-card" data-reveal="off" data-home-reveal>
            <div className="home-roles-head">
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
              <div className="home-role-list">
                {openRoles.slice(0, 4).map((role) => (
                  <Link
                    key={role.id}
                    href={`/form-builder/apply/${role.id}`}
                    className="home-role"
                  >
                    <span className="home-role-title">{role.title || "Untitled role"}</span>
                    <span className="home-role-meta">
                      {role.createdAt ? `Posted ${new Date(role.createdAt).toLocaleDateString()}` : "Open now"}
                    </span>
                    <span className="home-role-arrow" aria-hidden="true">↗</span>
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

      <section className="home-section px-6 md:px-16">
        <div className="shell home-faq">
          <div className="home-faq-intro" data-home-reveal>
            <p className="kicker">Good to know</p>
            <h2 className="display-lg mt-2 mb-3">Questions that come up a lot.</h2>
            <p className="muted text-sm leading-relaxed max-w-sm">
              Short answers to the things people ask most. Anything not covered here is a message
              away.
            </p>
          </div>
          <div className="home-faq-list">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta px-6 md:px-16" data-home-reveal>
        <div className="home-cta-aura" aria-hidden="true" />
        <div className="shell home-cta-inner">
          <p className="kicker justify-center">Collaborations &amp; community</p>
          <h2 className="home-cta-title">Have something in mind?</h2>
          <p className="muted max-w-xl mx-auto leading-relaxed">
            Sponsorships, collabs, editing help, or just a hello — send a message and it lands
            straight in the inbox.
          </p>
          <div className="home-actions home-actions-center">
            <Link href="/join" className="btn btn-primary">
              Start a conversation <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/positions" className="btn btn-secondary">
              Open positions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
