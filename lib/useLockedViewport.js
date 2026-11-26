"use client";

import { useEffect } from "react";

const KEYBOARD_MIN = 120;

/**
 * Marks the document as a single-screen view while the calling component is mounted.
 * Auth screens use it so the page cannot scroll and the footer and scroll runner stay away.
 *
 * It also watches the visual viewport. A phone keyboard shrinks the visual viewport without
 * shrinking the layout viewport, so the card used to stay centred in a space the keyboard
 * covered. The --keyboard height lets the screen end above the keyboard, and the field being
 * typed into is scrolled into that space so the show-password button beside it stays reachable.
 */
export default function useLockedViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    root.dataset.viewport = "locked";

    let frame = 0;
    let timer = 0;
    let lastField = null;
    const isField = (node) =>
      node instanceof HTMLElement &&
      node.matches("input:not([type=checkbox]):not([type=radio]), textarea, select");

    const revealField = (field) => {
      if (!field || !field.isConnected) return;
      field.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const revealFocusedField = () => {
      revealField(isField(document.activeElement) ? document.activeElement : lastField);
    };

    const rememberField = (event) => {
      if (!isField(event.target)) return;
      lastField = event.target;
      if (root.dataset.keyboard !== "open") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => revealField(lastField), 120);
    };

    const sync = () => {
      if (!viewport) return;
      const keyboard = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
      );
      /* Pinch zoom shrinks the visual viewport too. Only treat a short viewport as a
         keyboard while a field has focus, or while one is already open. */
      const typing = isField(document.activeElement);
      const open =
        keyboard > KEYBOARD_MIN && (typing || root.dataset.keyboard === "open");
      root.style.setProperty("--keyboard", `${open ? keyboard : 0}px`);
      if (!open) {
        delete root.dataset.keyboard;
        return;
      }
      root.dataset.keyboard = "open";
      window.clearTimeout(timer);
      timer = window.setTimeout(revealFocusedField, 220);
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sync);
    };

    sync();

    document.addEventListener("focusin", rememberField);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      document.removeEventListener("focusin", rememberField);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      root.style.removeProperty("--keyboard");
      delete root.dataset.keyboard;
      delete root.dataset.viewport;
    };
  }, []);
}
