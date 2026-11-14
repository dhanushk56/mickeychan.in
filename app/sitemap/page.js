import Link from "next/link";

export const metadata = {
  title: "Sitemap",
  description: "Every page on mickeychan.in, in one place.",
};

const SECTIONS = [
  {
    title: "Explore",
    description: "The public side of the site.",
    links: [
      { href: "/", label: "Home", note: "Landing page, latest videos and announcements" },
      { href: "/videos", label: "Videos", note: "The full video library, searchable by tag" },
      { href: "/announcements", label: "Announcements", note: "Current and past notices" },
      { href: "/socials", label: "Socials", note: "Everywhere else to find Mickey" },
    ],
  },
  {
    title: "Join the team",
    description: "Applications and getting in touch.",
    links: [
      { href: "/positions", label: "Open positions", note: "Roles currently open, with application forms" },
      { href: "/join", label: "Contact", note: "Send a message to the team" },
    ],
  },
  {
    title: "Your account",
    description: "Signing in and keeping your account secure.",
    links: [
      { href: "/login", label: "Log in", note: "Username or email, plus password" },
      { href: "/register", label: "Register", note: "Create an account, or continue with Google" },
      { href: "/verify", label: "Verify your account", note: "Confirm your email address with a 6-digit code" },
    ],
  },
  {
    title: "Team tools",
    description: "Locked to the accounts on the admin list.",
    links: [
      { href: "/admin", label: "Admin console", note: "Applications, accounts, content and activity" },
      { href: "/form-builder", label: "Form builder", note: "Build and publish application forms" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <main className="page">
      <div className="shell">
        <div className="max-w-2xl mb-10">
          <p className="kicker">Everything in one place</p>
          <h1 className="display-lg mt-3 mb-4">Sitemap</h1>
          <p className="muted text-lg leading-relaxed">
            Every page on mickeychan.in, grouped the way the site is. Public pages are open to
            anyone; team tools need an account on the admin list.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className="glass-card p-6 lift">
              <p className="kicker">{section.title}</p>
              <p className="faint text-xs mt-2 mb-4">{section.description}</p>
              <ul className="grid gap-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="glass-soft p-3 flex items-start justify-between gap-3 rounded-xl"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold text-sm block">{link.label}</span>
                        <span className="faint text-xs block mt-0.5">{link.note}</span>
                      </span>
                      <span aria-hidden="true" className="faint text-sm">
                        ↗
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="glass-card p-6 md:p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold">Looking for something specific?</p>
            <p className="muted text-sm mt-1">
              Send a message and we&apos;ll point you at the right page.
            </p>
          </div>
          <Link href="/join" className="btn btn-primary">
            Start a conversation <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
