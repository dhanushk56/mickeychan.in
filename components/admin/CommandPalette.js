"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useBodyScrollLock from "@/lib/useBodyScrollLock";

const GROUP_ORDER = ["Go to", "Actions", "Applications", "Messages", "Accounts", "Forms"];
const MAX_RESULTS = 6;
// Go to and Actions are short lists, so they show in full.
const KEEP_ALL = new Set(["Go to", "Actions"]);

function searchText(item) {
  return `${item.label} ${item.hint || ""} ${item.keywords || ""}`.toLowerCase();
}

// Both layers live on the body, so a page wrapper with its own transform or
// animation cannot trap them under the site header.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Tab should walk the open dialog, not the page behind it.
function trapTab(event) {
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

export function CommandPalette({ open, onClose, items, modKey = "Ctrl" }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const mounted = useMounted();
  useBodyScrollLock(open && mounted);

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setActive(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const groups = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const buckets = new Map();

    for (const item of items) {
      if (tokens.length > 0) {
        const text = searchText(item);
        if (!tokens.every((token) => text.includes(token))) continue;
      }
      const bucket = buckets.get(item.group);
      if (bucket) bucket.push(item);
      else buckets.set(item.group, [item]);
    }

    const rank = (item) => (tokens.length > 0 ? item.label.toLowerCase().indexOf(tokens[0]) : 0);

    return GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => {
      const found = buckets.get(group).slice().sort((a, b) => rank(a) - rank(b));
      return { group, items: KEEP_ALL.has(group) ? found : found.slice(0, MAX_RESULTS) };
    });
  }, [items, query]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));
  const current = flat[activeIndex];

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector('[data-active="true"]');
    if (node) node.scrollIntoView({ block: "nearest" });
  }, [active, query, open]);

  if (!open || !mounted) return null;

  function runItem(item) {
    onClose();
    item.run?.(query.trim());
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActive((index) => {
        const base = Math.min(index, flat.length - 1);
        return event.key === "ArrowDown"
          ? (base + 1) % flat.length
          : (base - 1 + flat.length) % flat.length;
      });
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, flat.length - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (current) runItem(current);
    }
  }

  let offset = 0;
  const blocks = groups.map((group) => {
    const start = offset;
    offset += group.items.length;
    return { ...group, start };
  });

  return createPortal(
    <div className="palette-backdrop">
      <button
        type="button"
        className="palette-scrim"
        aria-label="Close search"
        onClick={onClose}
      />
      <div
        className="palette animate-rise"
        role="dialog"
        aria-modal="true"
        aria-label="Search the admin console"
        onKeyDown={trapTab}
      >
        <div className="palette-field">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
            className="palette-icon"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search people, answers, accounts and tabs"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-autocomplete="list"
            aria-activedescendant={current ? `palette-option-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="kbd">{modKey} K</kbd>
        </div>

        <div
          className="palette-results"
          id="palette-results"
          role="listbox"
          aria-label="Results"
          ref={listRef}
        >
          {blocks.length === 0 && (
            <p className="palette-empty">
              Nothing matches that. Try a name, an email or a tab.
            </p>
          )}
          {blocks.map((block) => (
            <div key={block.group} className="palette-group">
              <p className="palette-group-label">{block.group}</p>
              {block.items.map((item, index) => {
                const optionIndex = block.start + index;
                const isActive = optionIndex === activeIndex;
                return (
                  <button
                    key={item.id}
                    id={`palette-option-${optionIndex}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className="palette-item"
                    data-active={isActive}
                    onMouseMove={() => setActive(optionIndex)}
                    onClick={() => runItem(item)}
                  >
                    <span className="palette-item-label">{item.label}</span>
                    {item.hint && <span className="palette-item-hint">{item.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="palette-foot">
          <span>
            <kbd className="kbd">{"\u2191"}</kbd> <kbd className="kbd">{"\u2193"}</kbd> to move
          </span>
          <span>
            <kbd className="kbd">Enter</kbd> to open
          </span>
          <span>
            <kbd className="kbd">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ShortcutSheet({ open, onClose, rows }) {
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
