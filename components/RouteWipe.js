"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAGE_LABELS = {
  "/": "Home",
  "/videos": "Videos",
  "/announcements": "Announcements",
  "/socials": "Socials",
  "/positions": "Open positions",
  "/join": "Contact",
  "/login": "Log in",
  "/register": "Create account",
  "/forgot-password": "Reset password",
  "/verify": "Verify email",
  "/admin": "Admin console",
  "/audit": "Audit log",
  "/sitemap": "Sitemap",
  "/form-builder": "Form builder",
};

function titleCase(value) {
  return value.replace(/-/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function pageLabel(pathname) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  if (pathname.startsWith("/form-builder/apply/")) return "Application";
  if (pathname.startsWith("/form-builder/")) return "Form editor";
  if (pathname.startsWith("/admin")) return "Admin console";
  if (pathname.startsWith("/audit")) return "Audit log";
  const segment = pathname.split("/").filter(Boolean).pop();
  return segment ? titleCase(segment) : "Mickey Chan";
}

export default function RouteWipe() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useClientLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;

    if (from === pathname) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    root.classList.add("is-arriving");
    setLeaving(false);
    setActive(true);

    const lift = window.setTimeout(() => setLeaving(true), 440);
    const settle = window.setTimeout(() => {
      setActive(false);
      root.classList.remove("is-arriving");
    }, 1360);

    return () => {
      window.clearTimeout(lift);
      window.clearTimeout(settle);
      root.classList.remove("is-arriving");
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div className={`route-wipe${leaving ? " is-leaving" : ""}`} aria-hidden="true">
      <div className="route-wipe-sheet" />
      <div className="route-wipe-mark">
        <img src="/mickey-logo.png" alt="" width={48} height={48} className="route-wipe-logo" />
        <span className="route-wipe-brand">Mickey Chan</span>
        <span className="route-wipe-name" key={pathname}>{pageLabel(pathname)}</span>
        <span className="route-wipe-rule" />
      </div>
    </div>
  );
}
