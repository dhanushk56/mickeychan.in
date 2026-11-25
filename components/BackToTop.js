"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SHOW_AT = 0.2;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let max = 0;

    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };

    const update = () => {
      setVisible(max > 8 && window.scrollY / max >= SHOW_AT);
    };

    const refresh = () => {
      measure();
      update();
    };

    refresh();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", refresh);

    const observer = new ResizeObserver(refresh);
    observer.observe(document.body);

    const settle = window.setTimeout(refresh, 250);

    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", refresh);
      observer.disconnect();
    };
  }, [pathname]);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className="back-to-top"
      data-visible={visible ? "true" : "false"}
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={visible ? undefined : "true"}
      tabIndex={visible ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          d="M12 19V6M6 12l6-6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
