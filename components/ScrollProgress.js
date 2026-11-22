"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ScrollProgress() {
  const barRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let max = 0;

    const measureMax = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };

    const update = () => {
      const value = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${value})`;
      bar.dataset.complete = value > 0.995 ? "true" : "false";
    };

    const refresh = () => {
      measureMax();
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

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span ref={barRef} className="scroll-progress-bar" />
    </div>
  );
}
