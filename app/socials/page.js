import { getSocials } from "@/lib/socials";
import SocialIcon from "@/components/SocialIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Socials",
  description:
    "Follow Mickey Chan across YouTube, Instagram and Discord. Every channel and server in one place, with the latest uploads, posts and community links.",
  alternates: { canonical: "/socials" },
};

export default async function SocialsPage() {
  const socials = await getSocials();

  return (
    <main className="page">
      <div className="shell">
        <div className="max-w-2xl mb-10">
          <p className="kicker">Stay connected</p>
          <h1 className="display-lg mt-3 mb-4">Find Mickey Chan online.</h1>
          <p className="muted text-lg leading-relaxed">
            Every place the team posts and talks. New videos land first on YouTube, and the links
            below are the ones the team actually uses.
          </p>
        </div>

        {socials.length === 0 ? (
          <div className="empty-state">
            <p className="font-display text-lg font-bold">No links up right now</p>
            <p className="muted text-sm max-w-md">
              The team has not listed any channels yet. Check back soon.
            </p>
          </div>
        ) : (
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
                <span className="faint text-lg flex-shrink-0" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        )}

        <p className="faint text-xs mt-8">
          Business enquiries:{" "}
          <a
            href="mailto:business@mickeychan.in"
            className="font-semibold"
            style={{ color: "var(--primary)" }}
          >
            business@mickeychan.in
          </a>
        </p>
      </div>
    </main>
  );
}
