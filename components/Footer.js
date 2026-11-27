import Link from "next/link";
import { getSocials } from "@/lib/socials";
import ShortcutsButton from "@/components/ShortcutsButton";

export default async function Footer() {
  const socials = await getSocials();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} Mickey Chan. All rights reserved.</p>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/videos">Videos</Link>
          <Link href="/forums">Forums</Link>
          <Link href="/socials">Socials</Link>
          <Link href="/positions">Open positions</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/sitemap">Sitemap</Link>
          <ShortcutsButton />
          {socials[0]?.href && (
            <a
              href={socials[0].href}
              target={socials[0].href.startsWith("mailto:") ? undefined : "_blank"}
              rel={socials[0].href.startsWith("mailto:") ? undefined : "noreferrer"}
            >
              {socials[0].short || socials[0].name} ↗
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
