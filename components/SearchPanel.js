"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function SearchPanel({ query, ready, results, minLength }) {
  const [term, setTerm] = useState(query);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setTerm(query);
  }, [query]);

  useEffect(() => {
    const focusBox = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    const onKey = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusBox();
        return;
      }

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        focusBox();
        return;
      }

      if (document.querySelector('[aria-modal="true"]')) return;

      if (event.key === "Escape" && listRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      const forward = event.key === "ArrowDown";
      const back = event.key === "ArrowUp";
      if (!forward && !back) return;

      const links = Array.from(listRef.current?.querySelectorAll("[data-search-result]") || []);
      if (links.length === 0) return;

      const fromBox = target === inputRef.current;
      if (fromBox && back) return;

      event.preventDefault();
      if (fromBox) {
        links[0].focus();
        return;
      }

      const index = links.indexOf(document.activeElement);
      if (index === -1) {
        links[0].focus();
        return;
      }
      const next = forward ? index + 1 : index - 1;
      if (next < 0 || next >= links.length) {
        inputRef.current?.focus();
        return;
      }
      links[next].focus();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function onBoxKeyDown(event) {
    if (event.key !== "Escape") return;
    if (term) {
      event.preventDefault();
      setTerm("");
    } else {
      event.currentTarget.blur();
    }
  }

  return (
    <>
      <form action="/search" method="get" role="search" className="flex flex-wrap items-end gap-2">
        <label className="field flex-1" style={{ minWidth: "14rem" }}>
          <span className="field-label">Word or phrase</span>
          <input
            ref={inputRef}
            className="input"
            type="search"
            name="q"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onBoxKeyDown}
            placeholder="A video title, a notice, a thread"
            autoComplete="off"
            aria-keyshortcuts="Control+K Meta+K"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <p className="faint text-xs mt-3">
        Press <kbd className="kbd">/</kbd> to jump to the box.{" "}
        <kbd className="kbd">{"\u2191"}</kbd> <kbd className="kbd">{"\u2193"}</kbd> walk the
        results, Enter opens one.
      </p>

      {!ready ? (
        <p className="muted text-sm mt-6">
          Type at least {minLength} characters and press Search. Every word has to appear somewhere
          in the result, and titles rank above body text.
        </p>
      ) : results.total === 0 ? (
        <div className="empty-state mt-8">
          <p className="font-display text-lg font-bold">Nothing matched &quot;{query}&quot;</p>
          <p className="muted text-sm max-w-md">
            Try a shorter word, or check the videos and announcements pages directly. Past
            announcements and wrapped story arcs stay searchable.
          </p>
          <Link href="/sitemap" className="btn btn-secondary btn-sm mt-2">
            Browse the sitemap
          </Link>
        </div>
      ) : (
        <div ref={listRef}>
          <p className="faint text-xs mt-6">
            {results.total} {results.total === 1 ? "result" : "results"} for &quot;{query}&quot;
          </p>

          {results.groups.map((group) => (
            <section key={group.id} className="mt-7" aria-label={group.label}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{group.label}</h2>
                <span className="faint text-xs">{group.items.length}</span>
              </div>
              <div className="grid gap-2 mt-3">
                {group.items.map((item) => (
                  <Link
                    key={`${group.id}-${item.href}-${item.title}`}
                    href={item.href}
                    data-search-result=""
                    className="glass-card lift p-4 grid gap-1"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.title}</span>
                      {item.meta && <span className="badge badge-neutral">{item.meta}</span>}
                    </span>
                    {item.excerpt && <span className="muted text-sm">{item.excerpt}</span>}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
