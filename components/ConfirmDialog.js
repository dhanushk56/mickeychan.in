"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function Dialog({ title, description, confirmLabel, cancelLabel, tone, onConfirm, onCancel }) {
  const danger = tone === "danger";

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 w-full h-full"
        style={{ background: "rgba(9, 6, 18, 0.55)", backdropFilter: "blur(12px)", cursor: "default" }}
        onClick={onCancel}
      />
      <div className="glass-card p-6 relative w-full animate-rise" style={{ maxWidth: "26rem" }}>
        <span className={`badge ${danger ? "badge-denied" : "badge-neutral"}`}>
          {danger ? "Please confirm" : "Confirm"}
        </span>
        <h2 id="confirm-dialog-title" className="font-display text-xl font-bold mt-3">
          {title}
        </h2>
        {description && (
          <p className="muted text-sm mt-2 leading-relaxed whitespace-pre-wrap">{description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"} btn-sm`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((config = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOptions({
        title: "Are you sure?",
        description: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "default",
        ...config,
      });
    });
  }, []);

  const settle = useCallback((value) => {
    if (resolver.current) {
      resolver.current(value);
      resolver.current = null;
    }
    setOptions(null);
  }, []);

  const dialog = options ? (
    <Dialog {...options} onCancel={() => settle(false)} onConfirm={() => settle(true)} />
  ) : null;

  return [dialog, ask];
}
