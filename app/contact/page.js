import Link from "next/link";
import { cookies } from "next/headers";
import { memberFromCookieStore } from "@/lib/members";
import { isEmailConfigured } from "@/lib/email";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with Mickey Chan — collaborations, sponsorships, business, suggestions or support. No account needed.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const member = await memberFromCookieStore(cookies());

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "48rem" }}>
        <div className="max-w-2xl mb-8">
          <p className="kicker">Say hello</p>
          <h1 className="display-lg mt-3 mb-4">Contact</h1>
          <p className="muted text-lg leading-relaxed">
            Collaborations, sponsorships, business, ideas or a problem with the site — send it here
            and a real person will read it. You don&apos;t need an account.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 mb-6">
          <div className="glass-card p-5">
            <p className="kicker block">Business &amp; sponsorship</p>
            <a
              href="mailto:business@mickeychan.in"
              className="font-semibold mt-2 inline-block"
              style={{ color: "var(--primary)" }}
            >
              business@mickeychan.in
            </a>
            <p className="faint text-xs mt-2 leading-relaxed">
              For media kits, rate cards and contracts. The form below reaches the same inbox.
            </p>
          </div>
          <div className="glass-card p-5">
            <p className="kicker block">Joining the team</p>
            <Link href="/positions" className="font-semibold mt-2 inline-block" style={{ color: "var(--primary)" }}>
              Open positions ↗
            </Link>
            <p className="faint text-xs mt-2 leading-relaxed">
              Applications go through the role listings, so your status stays on your account.
            </p>
          </div>
        </div>

        <ContactForm
          defaultName={member?.name || ""}
          defaultEmail={member?.email || ""}
          emailConfigured={isEmailConfigured()}
        />

        <p className="faint text-xs mt-6 leading-relaxed">
          Prefer the old contact form?{" "}
          <Link href="/join" className="hover:underline">
            It still works for signed-in accounts
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
