"use client";

import { useEffect, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 12-hour UTC rendering, used for the server/first paint so the markup is
// stable, and as the fallback wherever local formatting isn't available.
export function utc12(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hours24 = date.getUTCHours();
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const suffix = hours24 < 12 ? "AM" : "PM";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} · ${hours}:${minutes} ${suffix} UTC`;
}

// Shows the visitor's own clock (12-hour) once mounted; before that it prints
// the same UTC string the server produced, so hydration stays clean.
export default function LocalTime({ iso, className = "" }) {
  const [label, setLabel] = useState(() => utc12(iso));

  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    try {
      setLabel(
        date.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
          hour12: true,
        })
      );
    } catch {
      setLabel(utc12(iso));
    }
  }, [iso]);

  return (
    <time dateTime={iso} className={className} title={`${utc12(iso)} (UTC)`}>
      {label}
    </time>
  );
}
