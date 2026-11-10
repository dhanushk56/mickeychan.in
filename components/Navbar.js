"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/videos", label: "Videos" },
  { href: "/announcements", label: "Announcements" },
  { href: "/socials", label: "Socials" },
  { href: "/positions", label: "Open positions" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [member, setMember] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/member", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive) setMember(data?.member || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const accountHref = member ? "/api/auth/member/logout" : "/login";

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
          {member ? (
            <>
              <span className="badge badge-neutral hidden md:inline-flex" title={member.username}>
                {member.name}
              </span>
              <a href={accountHref} className="btn btn-secondary btn-sm hidden sm:inline-flex">
                Log out
              </a>
            </>
          ) : (
            <Link href="/login" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              Log in
            </Link>
          )}
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

        <nav className="mobile-nav" data-open={open} aria-label="Mobile" aria-hidden={!open}>
          {LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              data-active={isActive(link.href)}
              style={{ "--i": String(index) }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={accountHref}
            className="btn btn-secondary"
            style={{ "--i": String(LINKS.length) }}
            onClick={() => setOpen(false)}
          >
            {member ? `Log out (${member.username})` : "Log in"}
          </a>
          <Link
            href="/join"
            className="btn btn-primary mt-1"
            style={{ "--i": String(LINKS.length + 1) }}
            onClick={() => setOpen(false)}
          >
            Join us
          </Link>
        </nav>
      </div>
    </header>
  );
}
