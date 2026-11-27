"use client";

import { useEffect, useRef } from "react";

export default function PetalCursor() {
  const pointerRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return undefined;

    const pointer = pointerRef.current;
    if (!pointer) return undefined;

    const root = document.documentElement;
    root.classList.add("petal-cursor-on");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let scale = 1;

    const apply = () => {
      pointer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    };

    const move = (event) => {
      x = event.clientX;
      y = event.clientY;
      pointer.style.opacity = "1";
      apply();
    };

    const down = () => {
      scale = 0.92;
      apply();
    };

    const up = () => {
      scale = 1;
      apply();
    };

    const leave = () => {
      pointer.style.opacity = "0";
    };

    // A cross-origin frame (a YouTube embed) sends no pointer events to this
    // page and fires a null mouseout as the pointer crosses into it, so the
    // mouse leaving the window and the mouse entering a player look alike.
    // Ask what is under the pointer before hiding the cursor.
    const overEmbed = (clientX, clientY) => {
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
      const hit = document.elementFromPoint(clientX, clientY);
      return Boolean(hit && hit.closest("iframe, embed, object"));
    };

    const out = (event) => {
      if (event.relatedTarget) return;
      if (overEmbed(event.clientX, event.clientY)) return;
      leave();
    };

    const rootLeave = () => {
      if (overEmbed(x, y)) return;
      leave();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("mouseout", out);
    document.documentElement.addEventListener("mouseleave", rootLeave);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", out);
      document.documentElement.removeEventListener("mouseleave", rootLeave);
      root.classList.remove("petal-cursor-on");
    };
  }, []);

  return (
    <div ref={pointerRef} className="petal-pointer" aria-hidden="true">
      <img src="/cursors/mickey-head.png" alt="" draggable="false" />
    </div>
  );
}
