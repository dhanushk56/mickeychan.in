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

    const out = (event) => {
      if (event.relatedTarget) return;
      leave();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("mouseout", out);
    document.documentElement.addEventListener("mouseleave", leave);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", out);
      document.documentElement.removeEventListener("mouseleave", leave);
      root.classList.remove("petal-cursor-on");
    };
  }, []);

  return (
    <div ref={pointerRef} className="petal-pointer" aria-hidden="true">
      <img src="/cursors/mickey-head.png" alt="" draggable="false" />
    </div>
  );
}
