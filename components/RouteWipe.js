"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// The character plays at native speed, then the page name holds for two seconds.
const DURATION = 6100;

const AUTH_FACES = new Set(["/login", "/register"]);

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
  const videoRef = useRef(null);
  const [active, setActive] = useState(false);

  useClientLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;

    if (from === pathname) return undefined;
    if (AUTH_FACES.has(from) && AUTH_FACES.has(pathname)) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    root.classList.add("is-arriving");
    setActive(true);

    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        // A video that has not buffered yet will start from wherever it can.
      }
      const played = video.play();
      if (played && typeof played.catch === "function") played.catch(() => {});
    }

    const settle = window.setTimeout(() => {
      setActive(false);
      root.classList.remove("is-arriving");
      if (video) video.pause();
    }, DURATION);

    return () => {
      window.clearTimeout(settle);
      root.classList.remove("is-arriving");
      if (video) video.pause();
    };
  }, [pathname]);

  return (
    <div className="page-wipe" data-active={active ? "true" : "false"} aria-hidden="true">
      <video
        ref={videoRef}
        className="page-wipe-cast"
        src="/media/route-intro.webm"
        poster="/media/route-intro-poster.png"
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
      />
      <span className="page-wipe-name" key={pathname}>
        {pageLabel(pathname)}
      </span>
    </div>
  );
}
