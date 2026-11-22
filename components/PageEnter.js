"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const AUTH_FACES = new Set(["/login", "/register"]);

export default function PageEnter() {
  const pathname = usePathname();
  const first = useRef(true);
  const previous = useRef(pathname);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;

    if (first.current) {
      first.current = false;
      return;
    }
    if (AUTH_FACES.has(from) && AUTH_FACES.has(pathname)) return;

    const main = document.querySelector("main");
    if (!main) return;

    if (pathname === "/") {
      main.removeAttribute("data-entering");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    main.removeAttribute("data-entering");
    void main.offsetWidth;
    main.setAttribute("data-entering", "true");
  }, [pathname]);

  return null;
}
