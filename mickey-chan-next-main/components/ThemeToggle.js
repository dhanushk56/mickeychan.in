"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }) {
  // Starts null so the server-rendered markup and first client render
  // match (the real value is already on <html> from the inline script
  // in layout.js, which runs before React hydrates).
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("mc-theme", next);
    } catch {
      // localStorage can be unavailable (private mode, disabled) — theme just won't persist.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle ${className}`}
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
