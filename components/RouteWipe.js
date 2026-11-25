"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Character plays to 2.0s and fades out during the title's entry. The page name is
// dragged across by her hands from 2.0s, lands at 2.45s, holds for one second,
// clears at 3.75s.
const DURATION = 3750;

// Login and register share one form that flips in place, so the intro is skipped
// between them. Every other navigation keeps it.
const AUTH_FACES = new Set(["/login", "/register"]);

const PAGE_LABELS = {
  "/": "Home",
  "/videos": "Videos",
  "/hub": "Hub",
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
  "/forums": "Forums",
  "/sitemap": "Sitemap",
  "/form-builder": "Form builder",
};

function titleCase(value) {
  return value.replace(/-/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function pageLabel(pathname) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  const root = rootSegment(pathname);
  if (root !== pathname && PAGE_LABELS[root]) return PAGE_LABELS[root];
  if (pathname.startsWith("/form-builder/apply/")) return "Application";
  if (pathname.startsWith("/form-builder/")) return "Form editor";
  if (pathname.startsWith("/admin")) return "Admin console";
  if (pathname.startsWith("/audit")) return "Audit log";
  const segment = pathname.split("/").filter(Boolean).pop();
  return segment ? titleCase(segment) : "Mickey Chan";
}

function isAuthFlip(fromPath, toPath) {
  return AUTH_FACES.has(fromPath) && AUTH_FACES.has(toPath);
}

// The curtain belongs to changing section, not to every click. Moving from
// /forums to a thread inside it, or from /videos to a single video, keeps the
// page it is already on, so only the first path segment is compared.
function rootSegment(pathname) {
  const [first = ""] = String(pathname || "/").split("/").filter(Boolean);
  return `/${first}`;
}

function changesSection(fromPath, toPath) {
  return rootSegment(fromPath) !== rootSegment(toPath);
}

export default function RouteWipe() {
  const pathname = usePathname();

  // Only a jump to another section counts as a navigation. Query strings drive
  // filters and sorts, and deeper paths stay inside the section they started
  // in, so neither one replays the curtain.
  const previous = useRef(pathname);
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(0);
  const lastFire = useRef(0);
  const [label, setLabel] = useState("");

  const fire = useCallback((path) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // A pathname change and a popstate can describe the same navigation.
    const now = Date.now();
    if (now - lastFire.current < 250) return;
    lastFire.current = now;

    const root = document.documentElement;
    const overlay = overlayRef.current;
    const video = videoRef.current;

    setLabel(pageLabel(path));
    root.classList.add("is-arriving");

    // Re-adding the class after a forced reflow restarts the CSS animations even
    // when a second navigation lands before the first run has finished.
    if (overlay) {
      overlay.classList.remove("is-running");
      void overlay.offsetWidth;
      overlay.classList.add("is-running");
    }

    // iOS refuses play() while the video is still fully transparent, so start it
    // on the next frame and retry once if the first attempt is rejected.
    const startVideo = () => {
      if (!video) return;
      try {
        // Seeking to where it already is costs a decoder reset and a visible hitch.
        if (video.currentTime > 0.05) video.currentTime = 0;
      } catch {
        // A video that has not buffered yet starts from wherever it can.
      }
      const played = video.play();
      if (played && typeof played.catch === "function") {
        played.catch(() => {
          window.setTimeout(() => {
            try {
              if (video.currentTime > 0.05) video.currentTime = 0;
            } catch {
              // Ignore and let the retry play from the current position.
            }
            const retried = video.play();
            if (retried && typeof retried.catch === "function") retried.catch(() => {});
          }, 160);
        });
      }
    };
    window.requestAnimationFrame(startVideo);

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (overlay) overlay.classList.remove("is-running");
      root.classList.remove("is-arriving");
      if (video) video.pause();
    }, DURATION);
  }, []);

  useClientLayoutEffect(() => {
    const fromPath = previous.current;
    previous.current = pathname;
    if (fromPath === pathname) return;
    if (isAuthFlip(fromPath, pathname)) return;
    if (!changesSection(fromPath, pathname)) return;
    fire(pathname);
  }, [pathname, fire]);

  useEffect(() => {
    // A back/forward cache restore replays no React navigation, and iOS back
    // swipes often land that way, so run the beat from the history events too.
    const onRestore = (event) => {
      if (event && event.type === "pageshow" && !event.persisted) return;
      const fromPath = previous.current;
      const toPath = window.location.pathname;
      previous.current = toPath;
      if (fromPath === toPath) return;
      if (isAuthFlip(fromPath, toPath)) return;
      if (!changesSection(fromPath, toPath)) return;
      fire(toPath);
    };

    // Unlocks inline playback for later programmatic play() calls on iOS.
    const unlock = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      const played = video.play();
      if (played && typeof played.then === "function") {
        played
          .then(() => {
            video.pause();
            try {
              if (video.currentTime > 0.05) video.currentTime = 0;
            } catch {
              // Nothing to rewind yet.
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("pageshow", onRestore);
    window.addEventListener("popstate", onRestore);
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });

    return () => {
      window.removeEventListener("pageshow", onRestore);
      window.removeEventListener("popstate", onRestore);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.clearTimeout(timerRef.current);
    };
  }, [fire]);

  return (
    <div className="page-wipe" ref={overlayRef} aria-hidden="true">
      <video
        ref={videoRef}
        className="page-wipe-cast"
        src="/media/route-intro.mp4"
        poster="/media/route-intro-poster.jpg"
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
      />
      <span className="page-wipe-name">{label}</span>
    </div>
  );
}
