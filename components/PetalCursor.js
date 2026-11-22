"use client";

import { useEffect, useRef } from "react";

const HOT = "a, button, summary, label, input, textarea, select, [role='button'], .btn, .chip";

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
      const hot = event.target instanceof Element && Boolean(event.target.closest(HOT));
      pointer.dataset.state = hot ? "hover" : "default";
      scale = hot ? 1.04 : 1;
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
      <svg viewBox="0 0 30 30" data-cursor="default">
        <defs>
          <linearGradient id="cursor-pink-arrow" x1="0" y1="0" x2=".85" y2="1">
            <stop offset="0%" stopColor="#e8b6ff" />
            <stop offset="42%" stopColor="#ff86c8" />
            <stop offset="100%" stopColor="#ff3d8f" />
          </linearGradient>
        </defs>
        <path
          d="M5.5 3.2 5.5 22.2 10.6 17.4 14.3 25.2 18.6 23.4 14.9 15.8 22.4 15.1 Z"
          fill="url(#cursor-pink-arrow)"
          stroke="#26232b"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
      </svg>
      <svg viewBox="0 0 30 30" data-cursor="hover">
        <defs>
          <linearGradient id="cursor-pink-hand" x1="0" y1="0" x2=".85" y2="1">
            <stop offset="0%" stopColor="#e8b6ff" />
            <stop offset="42%" stopColor="#ff86c8" />
            <stop offset="100%" stopColor="#ff3d8f" />
          </linearGradient>
        </defs>
        <path
          d="M10.2 14.6 10.2 6.3C10.2 4.9 11.1 4.1 12.3 4.1C13.5 4.1 14.4 4.9 14.4 6.3L14.4 10.6C14.8 9.8 15.6 9.3 16.6 9.3C17.9 9.3 18.8 10.2 19 11.4C19.3 10.6 20.1 10.1 21.1 10.1C22.4 10.1 23.3 11 23.5 12.2C23.8 11.4 24.6 10.9 25.4 10.9C26.4 10.9 27.2 11.7 27.2 12.7L27.2 16.8C27.2 20.2 24.5 22.9 21.1 22.9L14.4 22.9C12.2 22.9 10.1 21.9 8.8 20.2L5.5 16.2C4.7 15.4 4.7 14 5.5 13.2C6.3 12.4 7.8 12.5 8.6 13.5L10.2 15.4Z"
          fill="url(#cursor-pink-hand)"
          stroke="#26232b"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
