"use client";

import { useEffect } from "react";
import { lowPowerMode } from "@/lib/performance";

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

function parseCount(raw) {
  const match = String(raw).match(/^([\d.,]+)(.*)$/);
  if (!match) return null;
  const numeric = match[1].replace(/,/g, "");
  const value = Number(numeric);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals: (numeric.split(".")[1] || "").length,
    suffix: match[2] || "",
  };
}

export default function HomeMotion() {
  useEffect(() => {
    // Parallax and the count-up are decoration. In light mode the numbers land
    // on their final value and the hero does not track the scroll at all.
    const reduce =
      lowPowerMode() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = document.querySelector(".home-hero");
    const reveals = Array.from(document.querySelectorAll("[data-home-reveal]"));

    const groups = new Map();
    for (const element of reveals) {
      const parent = element.parentElement || document.body;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      element.style.setProperty("--i", String(Math.min(index, 6)));
    }

    const animateCount = (element) => {
      if (element.dataset.counted === "true") return;
      element.dataset.counted = "true";
      const raw = element.dataset.count || element.textContent || "";
      const parsed = parseCount(raw);
      if (!parsed) {
        element.textContent = raw;
        return;
      }
      if (reduce) {
        element.textContent = `${parsed.value.toFixed(parsed.decimals)}${parsed.suffix}`;
        return;
      }
      const duration = 1600;
      const started = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        element.textContent = `${(parsed.value * easeOutCubic(progress)).toFixed(parsed.decimals)}${parsed.suffix}`;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const reveal = (element) => {
      element.classList.add("is-in");
      if (element.hasAttribute("data-count")) animateCount(element);
      for (const counter of element.querySelectorAll("[data-count]")) animateCount(counter);
    };

    let observer;
    if (typeof IntersectionObserver === "undefined") {
      for (const element of reveals) reveal(element);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
      );
      for (const element of reveals) observer.observe(element);
    }

    let frame = 0;
    let pointer = null;

    const paint = () => {
      frame = 0;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      hero.style.setProperty("--hero-y", `${(progress * 46).toFixed(2)}px`);
      hero.style.setProperty("--hero-ghost-y", `${(progress * -96).toFixed(2)}px`);
      hero.style.setProperty("--hero-fade", String(Math.max(0.2, 1 - progress * 0.9)));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onPointer = () => {
      if (!hero || !pointer) return;
      const event = pointer;
      pointer = null;
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100).toFixed(2)}%`);
      hero.style.setProperty("--my", `${(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100).toFixed(2)}%`);
    };

    const move = (event) => {
      pointer = event;
      if (!frame) frame = requestAnimationFrame(onPointer);
    };

    paint();
    if (!reduce) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      if (hero && window.matchMedia("(pointer: fine)").matches) {
        hero.addEventListener("pointermove", move);
      }
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (hero) hero.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, []);

  return null;
}
