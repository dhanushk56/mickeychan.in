"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

export default function Countdown({ to, className = "", expiredLabel = "now" }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(to).getTime();
  if (Number.isNaN(target)) return <span className={className}>—</span>;
  if (now === null) return <span className={className}>—</span>;

  const remaining = target - now;
  if (remaining <= 0) return <span className={className}>{expiredLabel}</span>;

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatRemaining(remaining)}
    </span>
  );
}
