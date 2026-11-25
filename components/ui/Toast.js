"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TONE_CLASS = {
  success: "badge-accepted",
  error: "badge-denied",
  info: "badge-neutral",
};

// One toast stack shared by every panel that opts in, so admin feedback looks
// and behaves the same wherever it comes from.
export function useToast(timeout = 4200) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    []
  );

  const push = useCallback(
    (message, tone = "success") => {
      const text = String(message || "").trim();
      if (!text) return;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current, { id, message: text, tone: TONE_CLASS[tone] ? tone : "info" }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, timeout);
      timers.current.push(timer);
    },
    [timeout]
  );

  const view = (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} className={`badge ${TONE_CLASS[toast.tone]}`}>
          {toast.message}
        </p>
      ))}
    </div>
  );

  return { push, view };
}
