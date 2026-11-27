"use client";

import { useEffect, useState } from "react";

// Overlays live on the body, so they only render once the document exists.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Tab should walk the open dialog, not the page behind it.
export function trapTab(event) {
  if (event.key !== "Tab") return;
  const nodes = event.currentTarget.querySelectorAll(
    'button, input, a[href], [tabindex]:not([tabindex="-1"])'
  );
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
