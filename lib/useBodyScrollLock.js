"use client";

import { useEffect } from "react";

// A confirm can open on top of the palette, so the page scroll stays locked
// until the last dialog closes.
let locks = 0;
let previousOverflow = "";

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        document.body.style.overflow = previousOverflow;
        previousOverflow = "";
      }
    };
  }, [active]);
}
