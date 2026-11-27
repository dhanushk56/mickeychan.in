"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useBodyScrollLock from "@/lib/useBodyScrollLock";

// Keyboard users get kept inside the panel while it is open, and land back on
// the control that opened it once it closes.
function useDialogFocus() {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;

    const focusable = () =>
      Array.from(
        panel?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => !element.disabled);

    const onKey = (event) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  return panelRef;
}

function Dialog({ title, description, confirmLabel, cancelLabel, tone, onConfirm, onCancel }) {
  const danger = tone === "danger";
  useBodyScrollLock();
  const panelRef = useDialogFocus();

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
      <div
        ref={panelRef}
        className="glass-card p-6 relative w-full animate-rise"
        style={{ maxWidth: "26rem" }}
      >
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

function PromptDialog({
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  tone,
  maxLength,
  multiline,
  onConfirm,
  onCancel,
}) {
  const danger = tone === "danger";
  useBodyScrollLock();
  const panelRef = useDialogFocus();
  const [value, setValue] = useState("");

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
      aria-labelledby="prompt-dialog-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 w-full h-full"
        style={{ background: "rgba(9, 6, 18, 0.55)", backdropFilter: "blur(12px)", cursor: "default" }}
        onClick={onCancel}
      />
      <form
        ref={panelRef}
        className="glass-card p-6 relative w-full animate-rise"
        style={{ maxWidth: "26rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(value);
        }}
      >
        <span className={`badge ${danger ? "badge-denied" : "badge-neutral"}`}>
          {danger ? "Please confirm" : "Confirm"}
        </span>
        <h2 id="prompt-dialog-title" className="font-display text-xl font-bold mt-3">
          {title}
        </h2>
        {description && (
          <p className="muted text-sm mt-2 leading-relaxed whitespace-pre-wrap">{description}</p>
        )}
        <label className="field mt-4">
          <span className="field-label">{label}</span>
          {multiline ? (
            <textarea
              className="textarea"
              rows={3}
              value={value}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          ) : (
            <input
              className="input"
              value={value}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          )}
        </label>
        <div className="flex flex-wrap gap-2 mt-5">
          <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"} btn-sm`}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function usePrompt() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((config = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOptions({
        title: "Are you sure?",
        description: "",
        label: "Reason (optional)",
        placeholder: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "default",
        maxLength: 300,
        multiline: false,
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
    <PromptDialog
      {...options}
      onCancel={() => settle(null)}
      onConfirm={(value) => settle(String(value || "").trim())}
    />
  ) : null;

  return [dialog, ask];
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
