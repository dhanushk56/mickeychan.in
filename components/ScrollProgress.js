"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEAD_SIZE = 13;

export default function ScrollProgress() {
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const headRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const track = trackRef.current;
    const bar = barRef.current;
    const head = headRef.current;
    if (!track || !bar || !head) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let max = 0;
    let width = 0;
    let frame = 0;
    let idle = 0;
    let lastY = window.scrollY;

    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
      width = track.getBoundingClientRect().width;
    };

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      const value = max > 8 ? Math.min(1, Math.max(0, y / max)) : 0;
      const travel = Math.max(0, width - HEAD_SIZE);
      const x = Math.min(travel, Math.max(0, value * width - HEAD_SIZE / 2));

      bar.style.transform = `scaleX(${value})`;
      head.style.transform = `translate3d(${x}px, 0, 0)`;
      track.dataset.complete = value > 0.995 ? "true" : "false";
      track.dataset.empty = value < 0.004 ? "true" : "false";

      if (!reduced.matches) {
        const direction = y > lastY ? "down" : y < lastY ? "up" : "";
        if (direction) {
          track.dataset.dir = direction;
          track.dataset.scrolling = "true";
          window.clearTimeout(idle);
          idle = window.setTimeout(() => {
            track.dataset.scrolling = "false";
            track.dataset.dir = "";
          }, 460);
        }
      }
      lastY = y;
    };

    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    const refresh = () => {
      measure();
      paint();
    };

    refresh();
    track.dataset.dir = "";
    track.dataset.scrolling = "false";

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", refresh);

    const observer = new ResizeObserver(refresh);
    observer.observe(document.body);

    const settle = window.setTimeout(refresh, 250);

    return () => {
      window.clearTimeout(idle);
      window.clearTimeout(settle);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", refresh);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div ref={trackRef} className="scroll-progress" aria-hidden="true">
      <span ref={barRef} className="scroll-progress-bar" />
      <span ref={headRef} className="scroll-progress-head" />
    </div>
  );
}
