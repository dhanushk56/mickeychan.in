"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { lowPowerMode } from "@/lib/performance";

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
    if (lowPowerMode()) return undefined;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    const counters = new WeakMap();

    const decorate = (element) => {
      if (element.classList.contains("reveal")) return;
      if (element.classList.contains("animate-rise")) return;
      if (element.dataset.reveal === "off") return;
      const parent = element.parentElement || document.body;
      const index = counters.get(parent) || 0;
      counters.set(parent, index + 1);
      element.style.setProperty("--reveal-i", String(Math.min(index, 6)));
      element.classList.add("reveal");
      observer.observe(element);
    };

    const viewportHeight = window.innerHeight;

    for (const element of Array.from(document.querySelectorAll(CARD_SELECTOR))) {
      const rect = element.getBoundingClientRect();
      if (rect.top <= viewportHeight * 0.9 || rect.height === 0) continue;
      decorate(element);
    }

    // Only the cards already on screen when a section renders are revealed. A
    // new search, a filter or a load more inserts fresh cards, and fading those
    // in would animate a page that has not actually changed section.
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
