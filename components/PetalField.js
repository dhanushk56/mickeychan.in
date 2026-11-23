"use client";

import { useEffect, useState } from "react";

const PALETTES = {
  light: ["#7c3aed", "#c026d3", "#db2777", "#2563eb"],
  dark: ["#c4b5fd", "#a78bfa", "#f9a8d4", "#93c5fd"],
};

const ALPHA = {
  light: [0.3, 0.48],
  dark: [0.18, 0.4],
};

function randomPetal(id) {
  const size = 10 + Math.random() * 22;
  return {
    id,
    left: Math.random() * 100,
    size,
    duration: 22 + Math.random() * 20,
    delay: -Math.random() * 30,
    drift: Math.random() * 180 - 90,
    rotate: 120 + Math.random() * 360,
    tone: Math.floor(Math.random() * 4),
    weight: Math.random(),
    blur: Math.random() > 0.55 ? 4 : 0,
  };
}

export default function PetalField() {
  const [petals, setPetals] = useState([]);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = 12 + Math.floor(Math.random() * 8);
    setPetals(Array.from({ length: count }, (_, i) => randomPetal(i)));
  }, []);

  const palette = PALETTES[theme] || PALETTES.light;
  const [from, to] = ALPHA[theme] || ALPHA.light;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: palette[p.tone],
            opacity: from + p.weight * (to - from),
            filter: p.blur ? `blur(${p.blur}px)` : undefined,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
