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
      const hot = event.target instanceof Element && Boolean(event.target.closest(HOT));
      pointer.dataset.state = hot ? "hover" : "default";
      scale = hot ? 1.06 : 1;
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
      layer.replaceChildren();
    };
  }, []);

  return (
    <>
      <div ref={layerRef} className="petal-cursor-layer" aria-hidden="true" />
      <div ref={pointerRef} className="petal-pointer" aria-hidden="true">
        <svg viewBox="0 0 30 30" data-cursor="default">
          <g fill="none" strokeLinecap="round">
            <path d="M5.4 4.6 11.4 20.6" stroke="#ffb020" strokeWidth="6" />
            <path d="M5.4 4.6 16.6 17.4" stroke="#ff3d9a" strokeWidth="6.6" />
            <path d="M5.4 4.6 20.6 13.6" stroke="#8b5cf6" strokeWidth="7" />
          </g>
          <circle cx="20" cy="19.6" r="2.4" fill="#8b5cf6" />
          <circle cx="24.2" cy="22.2" r="3" fill="#ff3d9a" />
          <circle cx="17.6" cy="24" r="2.2" fill="#ffb020" />
          <circle cx="26" cy="26.6" r="1.5" fill="#ff3d9a" />
        </svg>
        <svg viewBox="0 0 30 30" data-cursor="hover">
          <g fill="none" strokeLinecap="round">
            <path d="M5.6 13.6C6.2 17.6 7.4 20.2 9.2 21.8" stroke="#ffb020" strokeWidth="6.6" />
            <path d="M9.4 5.4C11.4 10 12.2 15.6 12.8 21" stroke="#ff3d9a" strokeWidth="7.2" />
            <path d="M11.6 8.6C15.8 6.2 19.8 7.2 21.8 10.8" stroke="#8b5cf6" strokeWidth="7" />
          </g>
          <circle cx="21" cy="19" r="2.6" fill="#ff3d9a" />
          <circle cx="25.2" cy="22" r="2.2" fill="#8b5cf6" />
          <circle cx="18.6" cy="24.2" r="1.7" fill="#ffb020" />
        </svg>
      </div>
    </>
  );
}
