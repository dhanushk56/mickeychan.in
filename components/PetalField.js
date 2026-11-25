"use client";

import { useEffect, useState } from "react";
import { lowPowerMode } from "@/lib/performance";

const PALETTE = ["#c4b5fd", "#a78bfa", "#f9a8d4", "#93c5fd"];
const ALPHA = [0.18, 0.4];

function randomPetal(id) {
  const size = 10 + Math.random() * 18;
  return {
    id,
    left: Math.random() * 100,
    size,
    duration: 26 + Math.random() * 20,
    delay: -Math.random() * 30,
    drift: Math.random() * 180 - 90,
    rotate: 120 + Math.random() * 360,
    tone: Math.floor(Math.random() * 4),
    weight: Math.random(),
  };
}

// Eight slow shapes, none of them blurred. A blurred element has to be
// re-rasterised as it moves, which is the expensive part on a weak GPU.
export default function PetalField() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    if (lowPowerMode()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = 7 + Math.floor(Math.random() * 4);
    setPetals(Array.from({ length: count }, (_, i) => randomPetal(i)));
  }, []);

  const [from, to] = ALPHA;

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
            background: PALETTE[p.tone],
            opacity: from + p.weight * (to - from),
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
