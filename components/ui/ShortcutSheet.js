"use client";

import { createPortal } from "react-dom";
import useBodyScrollLock from "@/lib/useBodyScrollLock";
import { trapTab, useMounted } from "@/components/ui/dialog-helpers";

// One sheet for the whole product: the console opens it on "?", and the site
// opens it from "?" or the footer button. Rows are grouped the same way in both.
export default function ShortcutSheet({ open, onClose, rows }) {
  const mounted = useMounted();
  useBodyScrollLock(open && mounted);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="palette-backdrop">
      <button
        type="button"
        className="palette-scrim"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />
      <div
        className="glass-card shortcut-sheet animate-rise"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onKeyDown={trapTab}
      >
        <div className="shortcut-sheet-head">
          <h2 id="shortcut-sheet-title" className="font-display text-lg font-bold">
            Keyboard shortcuts
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} autoFocus>
            Close
          </button>
        </div>

        {rows.map((row) => (
          <section key={row.group} className="shortcut-group">
            <p className="palette-group-label">{row.group}</p>
            {row.items.map((item) => (
              <div key={item.label} className="shortcut-row">
                <span>{item.label}</span>
                <span className="shortcut-keys">
                  {item.keys.map((key) => (
                    <kbd key={key} className="kbd">
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>,
    document.body
  );
}
