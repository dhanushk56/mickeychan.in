"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/NotificationsBell";

const LINKS = [
  { href: "/videos", label: "Videos" },
  { href: "/announcements", label: "Announcements" },
  { href: "/community", label: "Community" },
  { href: "/socials", label: "Socials" },
  { href: "/positions", label: "Open positions" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [member, setMember] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
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
    if (!accountOpen) return undefined;
    const onPointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

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
  const drawerBase = LINKS.length;

  return (
    <>
      <header className="site-nav">
        <div className="nav-shell" data-scrolled={scrolled}>
          <div className="nav-start">
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
            {member && <NotificationsBell key={member.username} />}
            <div className="nav-account" ref={accountRef}>
              {member ? (
                <div className="nav-account-wrap">
                  <button
                    type="button"
                    className="nav-avatar"
                    data-active={isActive("/my-account")}
                    data-open={accountOpen}
                    title="My account"
                    aria-label={`My account, ${member.name || member.username}`}
                    aria-haspopup="true"
                    aria-expanded={accountOpen}
                    aria-controls="nav-account-menu"
                    onClick={() => setAccountOpen(!accountOpen)}
                  >
                    {member.avatar ? (
                      <img src={member.avatar} alt="" />
                    ) : (
                      <span aria-hidden="true">{member.initials}</span>
                    )}
                  </button>

                  {accountOpen && (
                    <div className="account-pop" id="nav-account-menu">
                      <div className="account-pop-head">
                        <span className="avatar-frame" aria-hidden="true">
                          {member.avatar ? <img src={member.avatar} alt="" /> : member.initials}
                        </span>
                        <span className="account-pop-id">
                          <span className="account-pop-name">{member.name || member.username}</span>
                          <span className="account-pop-handle">@{member.username}</span>
                        </span>
                      </div>
                      <Link
                        href="/dashboard"
                        className="account-pop-item"
                        onClick={() => setAccountOpen(false)}
                      >
                        Dashboard
                        <span aria-hidden="true">→</span>
                      </Link>
                      <Link
                        href="/my-account"
                        className="account-pop-item"
                        onClick={() => setAccountOpen(false)}
                      >
                        View full profile
                        <span aria-hidden="true">→</span>
                      </Link>
                      <LogoutButton
                        endpoint="/api/auth/member/logout"
                        className="account-pop-item account-pop-logout"
                      >
                        Log out
                      </LogoutButton>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="nav-link">
                  Log in
                </Link>
              )}
            </div>
          </div>

          <Link href="/" className="nav-brand" aria-label="Mickey Chan home">
            <span className="nav-wordmark">Mickey Chan</span>
            <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
          </Link>

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
            <span className="mobile-nav-brand">Mickey Chan</span>
            <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
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

        {member && (
          <Link href="/my-account" className="mobile-nav-user" onClick={() => setOpen(false)}>
            <span className="avatar-frame" aria-hidden="true">
              {member.avatar ? <img src={member.avatar} alt="" /> : member.initials}
            </span>
            <span className="mobile-nav-user-name">
              {member.name || member.username}
              <span>@{member.username}</span>
            </span>
          </Link>
        )}

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

        {member ? (
          <>
            <Link
              href="/dashboard"
              className="btn btn-secondary"
              style={{ "--i": String(drawerBase) }}
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/my-account"
              className="btn btn-secondary"
              style={{ "--i": String(drawerBase + 1) }}
              onClick={() => setOpen(false)}
            >
              My account
            </Link>
            <LogoutButton
              endpoint="/api/auth/member/logout"
              className="btn btn-primary"
              style={{ "--i": String(drawerBase + 2) }}
            >
              Log out
            </LogoutButton>
          </>
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
      </nav>
    </>
  );
}
