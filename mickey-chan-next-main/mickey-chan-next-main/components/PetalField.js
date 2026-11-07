"use client";

import { useEffect, useState } from "react";

// Several shades of purple so the petals feel varied, not uniform.
const COLORS = [
  "#ede9fe",
  "#ddd6fe",
  "#c4b5fd",
  "#a78bfa",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6",
];

function randomPetal(id) {
  const size = 8 + Math.random() * 14;
  return {
    id,
    left: Math.random() * 100,
    size,
    duration: 11 + Math.random() * 12,
    delay: -Math.random() * 20,
    drift: Math.random() * 160 - 80,
    rotate: 180 + Math.random() * 540,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 0.4 + Math.random() * 0.4,
  };
}

export default function PetalField() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    const count = 16 + Math.floor(Math.random() * 14);
    setPetals(Array.from({ length: count }, (_, i) => randomPetal(i)));
  }, []);

  return (
    <div
      className="petal-field fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
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
