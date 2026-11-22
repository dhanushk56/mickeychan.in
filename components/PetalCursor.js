"use client";

import { useEffect, useRef } from "react";

const HOT = "a, button, summary, label, input, textarea, select, [role='button'], .btn, .chip";
const COLORS = ["#8b5cf6", "#c084fc", "#ff3d9a", "#ff7ac6", "#ffb020", "#ffd166"];
const SPAWN_MS = 70;
const MAX_PETALS = 36;

export default function PetalCursor() {
  const pointerRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return undefined;

    const pointer = pointerRef.current;
    const layer = layerRef.current;
    if (!pointer || !layer) return undefined;

    const root = document.documentElement;
    root.classList.add("petal-cursor-on");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let scale = 1;
    let lastSpawn = 0;

    const apply = () => {
      pointer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    };

    const spawn = (time) => {
      if (time - lastSpawn < SPAWN_MS) return;
      lastSpawn = time;
      if (layer.childElementCount >= MAX_PETALS) return;

      const size = 6 + Math.random() * 9;
      const petal = document.createElement("span");
      petal.className = "cursor-petal";
      petal.style.left = `${x + Math.random() * 18 - 9}px`;
      petal.style.top = `${y + Math.random() * 10 - 4}px`;
      petal.style.width = `${size}px`;
      petal.style.height = `${size}px`;
      petal.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      petal.style.setProperty("--dx", `${Math.random() * 90 - 45}px`);
      petal.style.setProperty("--fall", `${90 + Math.random() * 90}px`);
      petal.style.setProperty("--spin", `${120 + Math.random() * 260}deg`);
      petal.style.animationDuration = `${1.1 + Math.random() * 0.7}s`;
      petal.addEventListener("animationend", () => petal.remove(), { once: true });
      layer.appendChild(petal);
    };

    const move = (event) => {
      x = event.clientX;
      y = event.clientY;
      scale = event.target instanceof Element && event.target.closest(HOT) ? 1.12 : 1;
      pointer.style.opacity = "1";
      apply();
      spawn(event.timeStamp);
    };

    const down = () => {
      scale = 0.9;
      apply();
    };

    const up = () => {
      scale = 1;
      apply();
    };

    const leave = () => {
      pointer.style.opacity = "0";
    };

    const enter = () => {
      pointer.style.opacity = "1";
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
      root.classList.remove("petal-cursor-on");
      layer.replaceChildren();
    };
  }, []);

  return (
    <>
      <div ref={layerRef} className="petal-cursor-layer" aria-hidden="true" />
      <div ref={pointerRef} className="petal-pointer" aria-hidden="true">
        <svg viewBox="0 0 30 30">
          <defs>
            <linearGradient id="petal-pointer-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "#8b5cf6" }} />
              <stop offset="50%" style={{ stopColor: "#ff3d9a" }} />
              <stop offset="100%" style={{ stopColor: "#ffb020" }} />
            </linearGradient>
          </defs>
          <path
            d="M7 3.5 7 22 11.6 17.4 14.3 23.6 17.8 22 15.1 15.9 21.2 15.4 Z"
            fill="url(#petal-pointer-fill)"
            stroke="url(#petal-pointer-fill)"
            strokeWidth="3.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );
}
