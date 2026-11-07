"use client";

import { useEffect, useState } from "react";

// Soft drifting glass motes behind the UI. Deliberately few and faint so the
// frosted panels stay readable in both themes.
const COLORS = ["#c4b5fd", "#a78bfa", "#f9a8d4", "#93c5fd"];

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
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 0.18 + Math.random() * 0.22,
    blur: Math.random() > 0.55 ? 4 : 0,
  };
}

export default function PetalField() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = 12 + Math.floor(Math.random() * 8);
    setPetals(Array.from({ length: count }, (_, i) => randomPetal(i)));
  }, []);

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
            background: p.color,
            opacity: p.opacity,
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
