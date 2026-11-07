import { socials } from "@/data/socials";
import SocialIcon from "@/components/SocialIcon";

export const metadata = {
  title: "Socials",
  description: "Follow Mickey Chan across social platforms.",
};

export default function SocialsPage() {
  return (
    <main className="page">
      <div className="shell">
        <div className="max-w-2xl mb-10">
          <p className="kicker">Stay connected</p>
          <h1 className="display-lg mt-3 mb-4">Find Mickey Chan online.</h1>
          <p className="muted text-lg leading-relaxed">
            Follow along for new videos, live streams, updates, and everything happening in the
            community.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
                <span className="font-display text-lg font-bold truncate">{social.name}</span>
              </span>
              <span className="faint text-lg flex-shrink-0" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>

        <p className="faint text-xs mt-8">
          Business enquiries: <a href="mailto:business@mickeychan.in" className="font-semibold" style={{ color: "var(--primary)" }}>business@mickeychan.in</a>
        </p>
      </div>
    </main>
  );
}
