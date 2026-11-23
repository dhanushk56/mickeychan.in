"use client";

import { useEffect } from "react";

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

function countUp(element) {
  if (element.dataset.counted === "true") return;
  element.dataset.counted = "true";
  const parsed = parseCount(element.dataset.count || element.textContent || "");
  if (!parsed) return;
  const duration = 900;
  const started = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    element.textContent = `${(parsed.value * easeOutCubic(progress)).toFixed(parsed.decimals)}${parsed.suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function HomeReveal() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll("[data-home-reveal]"));
    if (!targets.length) return undefined;

    const settle = (element) => {
      element.classList.add("is-in");
      element.style.opacity = "";
      element.style.transform = "";
      for (const counter of element.querySelectorAll("[data-count]")) countUp(counter);
      if (element.hasAttribute("data-count")) countUp(element);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      for (const target of targets) settle(target);
      return undefined;
    }

    const hidden = targets.filter(
      (target) => target.getBoundingClientRect().top > window.innerHeight * 0.9
    );
    const groups = new Map();
    for (const target of hidden) {
      const parent = target.parentElement || document.body;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      target.style.opacity = "0";
      target.style.transform = "translateY(12px)";
      target.style.transitionDelay = `${Math.min(index, 5) * 40}ms`;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          settle(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );

    for (const target of hidden) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return null;
}
