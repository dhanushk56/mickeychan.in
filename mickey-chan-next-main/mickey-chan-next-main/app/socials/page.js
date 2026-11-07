import { socials } from "@/data/socials";
import SocialIcon from "@/components/SocialIcon";

export const metadata = {
  title: "Mickey's Socials",
  description: "Follow Mickey Chan across social platforms.",
};

export default function SocialsPage() {
  return (
    <main className="socials-page px-6 md:px-16 py-20 md:py-28">
      <div className="socials-shell max-w-4xl mx-auto">
        <div className="max-w-2xl mb-12">
          <p className="section-kicker">Stay connected</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-3 mb-5">
            Find Mickey Chan online.
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 leading-relaxed">
            Follow along for new videos, live streams, updates, and everything happening in the community.
          </p>
        </div>

        <div className="socials-grid grid gap-4 sm:grid-cols-2">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target={social.href === "#" ? undefined : "_blank"}
              rel={social.href === "#" ? undefined : "noreferrer"}
              className="social-card glass-card rounded-2xl p-6 flex items-center justify-between"
            >
              <span className="flex items-center gap-4">
                <SocialIcon name={social.icon} className="w-7 h-7 flex-shrink-0" />
                <span className="font-display text-xl font-bold">{social.name}</span>
              </span>
              <span className="social-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
