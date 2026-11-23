"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/features";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const needsVerify = EMAIL_VERIFICATION_REQUIRED && member && !member.emailVerified;
  const drawerBase = LINKS.length + (needsVerify ? 1 : 0);
  const verifyHref = `/verify?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <>
      <header className="site-nav">
        <div className="nav-shell" data-scrolled={scrolled}>
          <div className="nav-start">
            <Link href="/" className="brand-mark" aria-label="Mickey Chan home">
              <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
            </Link>
            <button
              type="button"
              className="icon-button menu-button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
            >
              <span className="menu-mark" data-open={open} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>

          <span className="nav-wordmark">Mickey Chan</span>

          <div className="nav-end">
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

            {member ? (
              <>
                {needsVerify && (
                  <Link href={verifyHref} className="btn btn-primary btn-sm">
                    Verify
                  </Link>
                )}
                <span className="badge badge-neutral" title={member.username}>
                  {member.name}
                </span>
                <LogoutButton
                  endpoint="/api/auth/member/logout"
                  className="btn btn-secondary btn-sm"
                >
                  Log out
                </LogoutButton>
              </>
            ) : (
              <Link href="/login" className="nav-link">
                Log in
              </Link>
            )}

            <Link href="/join" className="btn btn-primary btn-sm">
              Join us
            </Link>
          </div>
        </div>
      </header>

      <div
        className="mobile-scrim"
        data-open={open}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <nav
        id="mobile-menu"
        className="mobile-nav"
        data-open={open}
        aria-label="Mobile"
        aria-hidden={!open}
      >
        <div className="mobile-nav-head">
          <Link
            href="/"
            className="brand-mark"
            aria-label="Mickey Chan home"
            onClick={() => setOpen(false)}
          >
            <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
            <span className="mobile-nav-brand">Mickey Chan</span>
          </Link>
          <button
            type="button"
            className="icon-button mobile-nav-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {LINKS.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className="mobile-nav-link"
            data-active={isActive(link.href)}
            style={{ "--i": String(index) }}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}

        {needsVerify && (
          <Link
            href={verifyHref}
            className="btn btn-primary"
            style={{ "--i": String(LINKS.length) }}
            onClick={() => setOpen(false)}
          >
            Verify your account
          </Link>
        )}

        {member ? (
          <LogoutButton
            endpoint="/api/auth/member/logout"
            className="btn btn-secondary"
            style={{ "--i": String(drawerBase) }}
          >
            {`Log out (${member.username})`}
          </LogoutButton>
        ) : (
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ "--i": String(drawerBase) }}
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
        )}

        <Link
          href="/join"
          className="btn btn-primary"
          style={{ "--i": String(drawerBase + 1) }}
          onClick={() => setOpen(false)}
        >
          Join us
        </Link>
      </nav>
    </>
  );
}
