"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/videos", label: "Videos" },
  { href: "/socials", label: "Socials" },
  { href: "/positions", label: "Open positions" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-nav">
      <div className="nav-shell" data-scrolled={scrolled}>
        <Link href="/" className="brand-mark" aria-label="Mickey Chan home">
          <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
          <span className="hidden sm:inline">MICKEY CHAN</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              data-active={isActive(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/join" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Join us <span aria-hidden="true">↗</span>
          </Link>
          <button
            type="button"
            className="icon-button menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>

        {open && (
          <nav className="mobile-nav" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                data-active={isActive(link.href)}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/join" className="btn btn-primary mt-1" onClick={() => setOpen(false)}>
              Join us
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
