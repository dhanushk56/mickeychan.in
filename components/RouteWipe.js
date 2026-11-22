"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function RouteWipe() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useClientLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;

    if (pathname !== "/" || from === "/") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    root.classList.add("is-arriving");
    setLeaving(false);
    setActive(true);

    const lift = window.setTimeout(() => setLeaving(true), 560);
    const settle = window.setTimeout(() => {
      setActive(false);
      root.classList.remove("is-arriving");
    }, 1880);

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
        <span className="route-wipe-name">MICKEY CHAN</span>
        <span className="route-wipe-rule" />
      </div>
    </div>
  );
}
