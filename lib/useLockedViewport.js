"use client";

import { useEffect } from "react";

/**
 * Marks the document as a single-screen view while the calling component is mounted.
 * Auth screens use it so the page cannot scroll and the footer and scroll runner stay away.
 */
export default function useLockedViewport() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.viewport = "locked";
    return () => {
      delete root.dataset.viewport;
    };
  }, []);
}
