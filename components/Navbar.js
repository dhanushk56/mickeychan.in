"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/NotificationsBell";
import useBodyScrollLock from "@/lib/useBodyScrollLock";

// Videos, contact and open positions stand on their own. Everything about taking
// part in the channel sits behind one menu, which opens on hover.
const NAV = [
  { href: "/videos", label: "Videos" },
  {
    href: "/hub",
    label: "Community",
    items: [
      { href: "/hub", label: "Hub", note: "Polls, ideas and the calendar" },
      { href: "/announcements", label: "Announcements", note: "What is new on the channel" },
      { href: "/forums", label: "Forums", note: "Threads and replies" },
      { href: "/stories", label: "Stories", note: "Arcs, beat by beat" },
      { href: "/studio", label: "Studio", note: "What is next and behind the scenes" },
      { href: "/socials", label: "Socials", note: "Everywhere else to follow" },
    ],
  },
  { href: "/contact", label: "Contact" },
  { href: "/positions", label: "Open positions" },
];

export default function Navbar({ locked = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [member, setMember] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const searchRef = useRef(null);
  const drawerSearchRef = useRef(null);

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

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The search page and the console own their own keys, so this only runs
  // everywhere else.
  useEffect(() => {
    if (pathname === "/search" || pathname.startsWith("/admin")) return undefined;

    const onKey = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) return;
      if (document.querySelector('[aria-modal="true"]')) return;

      const wantsSearch =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey);
      if (!wantsSearch) return;

      event.preventDefault();
      if (searchRef.current && searchRef.current.offsetParent !== null) {
        searchRef.current.focus();
        searchRef.current.select();
        return;
      }

      setOpen(true);
      window.setTimeout(() => {
        drawerSearchRef.current?.focus();
        drawerSearchRef.current?.select();
      }, 80);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pathname]);

  function onSearchKeyDown(event) {
    if (event.key !== "Escape") return;
    if (search) {
      event.preventDefault();
      setSearch("");
    } else {
      event.currentTarget.blur();
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const term = search.trim();
    setOpen(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const drawerBase = NAV.length;
  const communityActive = NAV.find((entry) => entry.items)?.items.some((item) => isActive(item.href));

  // Land in the section that is already open on the page you are reading.
  useEffect(() => {
    if (communityActive) setGroupOpen(true);
  }, [communityActive]);

  // While the site is closed, the bar is shown but every control in it is inert
  // until someone unlocks the console. Nothing here navigates or opens a menu.
  if (locked) {
    return (
      <header className="site-nav">
        <div className="nav-shell" data-scrolled={scrolled} data-locked="true">
          <div className="nav-start">
            <span className="badge badge-pending">Locked</span>
          </div>

          <span className="nav-brand" data-locked="true" aria-disabled="true">
            <span className="nav-wordmark">Mickey Chan</span>
            <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
          </span>

          <div className="nav-end">
            <nav className="nav-links" aria-label="Main">
              {NAV.map((entry) => (
                <span
                  key={entry.label}
                  className="nav-link"
                  data-locked="true"
                  aria-disabled="true"
                  title="Locked while the site is in maintenance"
                >
                  {entry.label}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </header>
    );
  }

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
                      <img src={member.avatar} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span aria-hidden="true">{member.initials}</span>
                    )}
                  </button>

                  {accountOpen && (
                    <div className="account-pop" id="nav-account-menu">
                      <div className="account-pop-head">
                        <span className="avatar-frame" aria-hidden="true">
                          {member.avatar ? <img src={member.avatar} alt="" loading="lazy" decoding="async" /> : member.initials}
                        </span>
                        <span className="account-pop-id">
                          <span className="account-pop-name">{member.name || member.username}</span>
                          <span className="account-pop-handle">@{member.username}</span>
                        </span>
                      </div>
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
            <form className="nav-search" role="search" onSubmit={submitSearch}>
              <input
                ref={searchRef}
                className="nav-search-input"
                type="search"
                name="q"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search"
                aria-label="Search the site"
                aria-keyshortcuts="Control+K Meta+K"
                autoComplete="off"
              />
              <kbd className="kbd nav-search-kbd" aria-hidden="true">
                /
              </kbd>
              <button type="submit" className="nav-search-submit" aria-label="Search">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M10.4 10.4 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </form>
            <Link href="/search" className="nav-search-button" aria-label="Search the site">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10.4 10.4 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>

          <Link href="/" className="nav-brand" aria-label="Mickey Chan home">
            <span className="nav-wordmark">Mickey Chan</span>
            <img src="/mickey-logo.png" alt="" className="brand-logo" width={34} height={34} />
          </Link>

          <div className="nav-end">
            <nav className="nav-links" aria-label="Main">
              {NAV.map((entry) =>
                entry.items ? (
                  <div
                    key={entry.label}
                    className="nav-drop"
                    data-active={entry.items.some((item) => isActive(item.href))}
                  >
                    <Link href={entry.href} className="nav-link nav-drop-trigger" aria-haspopup="true">
                      {entry.label}
                      <svg
                        className="nav-drop-caret"
                        viewBox="0 0 10 6"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M1 1l4 4 4-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                    <div className="nav-drop-panel">
                      <div className="nav-drop-card">
                        {entry.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="nav-drop-item"
                            data-active={isActive(item.href)}
                          >
                            <span className="nav-drop-item-label">{item.label}</span>
                            <span className="nav-drop-item-note">{item.note}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className="nav-link"
                    data-active={isActive(entry.href)}
                  >
                    {entry.label}
                  </Link>
                )
              )}
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
        <form className="mobile-nav-search" role="search" onSubmit={submitSearch}>
          <input
            ref={drawerSearchRef}
            className="input"
            type="search"
            name="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search the site"
            aria-label="Search the site"
            aria-keyshortcuts="Control+K Meta+K"
            autoComplete="off"
          />
          <button type="submit" className="mobile-nav-search-submit" aria-label="Search">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10.4 10.4 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>

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
              {member.avatar ? <img src={member.avatar} alt="" loading="lazy" decoding="async" /> : member.initials}
            </span>
            <span className="mobile-nav-user-name">
              {member.name || member.username}
              <span>@{member.username}</span>
            </span>
          </Link>
        )}

        {NAV.map((entry, index) =>
          entry.items ? (
            <div key={entry.label} className="mobile-nav-group" style={{ "--i": String(index) }}>
              <button
                type="button"
                className="mobile-nav-link mobile-nav-toggle"
                aria-expanded={groupOpen}
                aria-controls="mobile-nav-community"
                onClick={() => setGroupOpen(!groupOpen)}
              >
                {entry.label}
                <svg
                  className="nav-drop-caret"
                  viewBox="0 0 10 6"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M1 1l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div
                id="mobile-nav-community"
                className="mobile-nav-panel"
                data-open={groupOpen}
              >
                <div className="mobile-nav-panel-inner">
                  {entry.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="mobile-nav-link mobile-nav-sublink"
                      data-active={isActive(item.href)}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={entry.href}
              href={entry.href}
              className="mobile-nav-link"
              data-active={isActive(entry.href)}
              style={{ "--i": String(index) }}
              onClick={() => setOpen(false)}
            >
              {entry.label}
            </Link>
          )
        )}

        {member ? (
          <>
            <Link
              href="/my-account"
              className="btn btn-secondary"
              style={{ "--i": String(drawerBase) }}
              onClick={() => setOpen(false)}
            >
              My account
            </Link>
            <LogoutButton
              endpoint="/api/auth/member/logout"
              className="btn btn-primary"
              style={{ "--i": String(drawerBase + 1) }}
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
