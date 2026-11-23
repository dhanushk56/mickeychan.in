"use client";

import { useEffect } from "react";

const SELECTOR = [
  ".glass-card",
  ".home-card",
  ".home-poster",
  ".home-tile",
  ".home-band-cell",
  ".video-card",
  ".stat",
  ".sub-card",
  ".faq-item",
  ".account-card",
  ".empty-state",
].join(",");

export default function CardGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let card = null;
    let pointerEvent = null;

    const paint = () => {
      frame = 0;
      if (!card || !pointerEvent) return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((pointerEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((pointerEvent.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x.toFixed(2)}%`);
      card.style.setProperty("--my", `${y.toFixed(2)}%`);
    };

    const onMove = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const next = target.closest(SELECTOR);
      if (!next) {
        card = null;
        pointerEvent = null;
        return;
      }
      card = next;
      pointerEvent = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      card = null;
      pointerEvent = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
