"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// The character plays at native speed and leaves at 2.8s; the page name enters
// as it goes, holds for two seconds, and the overlay clears at 5.6s.
const DURATION = 5600;

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
  const search = useSearchParams();
  const route = `${pathname}?${search ? search.toString() : ""}`;

  const previous = useRef(route);
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const [label, setLabel] = useState("");

  useClientLayoutEffect(() => {
    const from = previous.current;
    previous.current = route;

    if (from === route) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    const overlay = overlayRef.current;
    const video = videoRef.current;

    setLabel(pageLabel(pathname));
    root.classList.add("is-arriving");

    // Re-adding the class after a forced reflow restarts the CSS animations even
    // when a second navigation lands before the first run has finished.
    if (overlay) {
      overlay.classList.remove("is-running");
      void overlay.offsetWidth;
      overlay.classList.add("is-running");
    }

    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        // A video that has not buffered yet starts from wherever it can.
      }
      const played = video.play();
      if (played && typeof played.catch === "function") played.catch(() => {});
    }

    const settle = window.setTimeout(() => {
      if (overlay) overlay.classList.remove("is-running");
      root.classList.remove("is-arriving");
      if (video) video.pause();
    }, DURATION);

    return () => {
      window.clearTimeout(settle);
      if (overlay) overlay.classList.remove("is-running");
      root.classList.remove("is-arriving");
      if (video) video.pause();
    };
  }, [route, pathname]);

  return (
    <div className="page-wipe" ref={overlayRef} aria-hidden="true">
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
      <span className="page-wipe-name">{label}</span>
    </div>
  );
}
