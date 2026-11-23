"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.02 }
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

    if (typeof MutationObserver === "undefined") {
      return () => observer.disconnect();
    }

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(CARD_SELECTOR)) decorate(node);
          for (const child of node.querySelectorAll(CARD_SELECTOR)) decorate(child);
        }
      }
    });

    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
