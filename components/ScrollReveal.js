"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const search = useSearchParams().toString();
  const last = useRef({ pathname, search });

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") return undefined;

    // A new query on the page you are already on is an in-place update, not a
    // move to another section: filters, sorts and search results swap their
    // cards instantly instead of replaying the fade.
    const queryOnly = last.current.pathname === pathname && last.current.search !== search;
    last.current = { pathname, search };
    if (queryOnly) return undefined;

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

    const revealNew = (root) => {
      const nodes = root.matches && root.matches(CARD_SELECTOR) ? [root] : [];
      for (const element of Array.from(root.querySelectorAll ? root.querySelectorAll(CARD_SELECTOR) : nodes)) {
        nodes.push(element);
      }
      for (const element of nodes) {
        const rect = element.getBoundingClientRect();
        if (rect.height === 0) continue;
        // Cards inserted above the fold are already where the eye is, so they
        // show immediately. Only fresh cards further down get the fade.
        if (rect.top <= viewportHeight * 0.9) continue;
        decorate(element);
      }
    };

    for (const element of Array.from(document.querySelectorAll(CARD_SELECTOR))) {
      const rect = element.getBoundingClientRect();
      if (rect.top <= viewportHeight * 0.9 || rect.height === 0) continue;
      decorate(element);
    }

    // Pages like the video list load their cards after the first render and
    // swap them on every filter, so new cards are picked up as they land.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) revealNew(node);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname, search]);

  return null;
}
