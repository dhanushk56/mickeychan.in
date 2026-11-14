import Link from "next/link";
import { socials } from "@/data/socials";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} Mickey Chan. All rights reserved.</p>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/videos">Videos</Link>
          <Link href="/socials">Socials</Link>
          <Link href="/positions">Open positions</Link>
          <Link href="/join">Contact</Link>
          <Link href="/sitemap">Sitemap</Link>
          <a href={socials[0]?.href} target="_blank" rel="noreferrer">
            YouTube ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
