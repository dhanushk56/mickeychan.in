"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Cards that are already on screen when the page loads keep their CSS entrance
// animation; everything further down fades and lifts in as it is scrolled to.
const CARD_SELECTOR = [
  ".glass-card",
  ".glass-soft",
  ".video-card",
  ".stat",
  ".sub-card",
  ".faq-item",
  ".empty-state",
  ".application-card",
].join(",");

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") return undefined;

    const viewportHeight = window.innerHeight;

    // Only off-screen cards get the hidden state. Applying it to everything
    // would flash the visible ones, and marking them after mount means the page
    // is fully readable if this script never runs.
    const pending = Array.from(document.querySelectorAll(CARD_SELECTOR)).filter((element) => {
      if (element.classList.contains("animate-rise")) return false;
      if (element.dataset.reveal === "off") return false;
      const rect = element.getBoundingClientRect();
      return rect.top > viewportHeight * 0.9 && rect.height > 0;
    });

    if (pending.length === 0) return undefined;

    // Stagger within each row/grid so a group of cards cascades instead of all
    // popping at once.
    const seen = new Map();
    for (const element of pending) {
      const parent = element.parentElement || document.body;
      const index = seen.get(parent) || 0;
      seen.set(parent, index + 1);
      element.style.setProperty("--reveal-i", String(Math.min(index, 5)));
      element.classList.add("reveal");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    for (const element of pending) observer.observe(element);

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
