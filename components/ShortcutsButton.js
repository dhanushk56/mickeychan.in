"use client";

// The list lives in the navigation, so the footer only asks it to open.
export default function ShortcutsButton() {
  return (
    <button
      type="button"
      className="footer-shortcuts"
      aria-keyshortcuts="?"
      onClick={() => window.dispatchEvent(new Event("mc:shortcuts"))}
    >
      Keyboard shortcuts
    </button>
  );
}
