"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageEnter() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

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
