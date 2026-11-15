"use client";

import { useEffect, useRef, useState } from "react";
import {
  RICH_TEXT_FONTS,
  RICH_TEXT_SIZES,
  blocksToHtml,
  normalizeRichText,
  plainTextToHtml,
  safeLinkHref,
  splitLinkText,
} from "@/lib/rich-text";

const BLOCK_TAGS = new Set([
  "DIV",
  "P",
  "LI",
  "UL",
  "OL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "TR",
  "SECTION",
  "ARTICLE",
]);

const SIZE_PREFIX = "rt-size-";
const FONT_PREFIX = "rt-font-";

function formatOf(element) {
  const format = {};
  try {
    const style = window.getComputedStyle(element);
    const weight = parseInt(style.fontWeight, 10);
    if (Number.isFinite(weight) && weight >= 600) format.b = true;
    if (style.fontStyle === "italic" || style.fontStyle === "oblique") format.i = true;
    const decoration = `${style.textDecorationLine || ""} ${style.textDecoration || ""}`;
    if (decoration.includes("underline")) format.u = true;
    if (decoration.includes("line-through")) format.s = true;
  } catch {
  }
  for (const name of Array.from(element.classList || [])) {
    if (name.startsWith(SIZE_PREFIX)) format.size = name.slice(SIZE_PREFIX.length);
    if (name.startsWith(FONT_PREFIX)) format.font = name.slice(FONT_PREFIX.length);
  }
  return format;
}

function htmlToBlocks(root) {
  const blocks = [];
  let current = [];

  const pushRun = (run) => {
    if (!run.text) return;
    const last = current[current.length - 1];
    const same =
      last &&
      Boolean(last.b) === Boolean(run.b) &&
      Boolean(last.i) === Boolean(run.i) &&
      Boolean(last.u) === Boolean(run.u) &&
      Boolean(last.s) === Boolean(run.s) &&
      (last.size || "md") === (run.size || "md") &&
      (last.font || "body") === (run.font || "body") &&
      (last.link || "") === (run.link || "");
    if (same) {
      last.text += run.text;
      return;
    }
    current.push(run);
  };

  const flush = () => {
    blocks.push({ runs: current });
    current = [];
  };

  const walk = (node, format) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue.replace(/\u00a0/g, " ");
      if (text) pushRun({ ...format, text });
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.tagName === "BR") {
      flush();
      return;
    }
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;

    const isBlock = BLOCK_TAGS.has(node.tagName);
    if (isBlock && current.length > 0) flush();
    const anchorHref = node.tagName === "A" ? safeLinkHref(node.getAttribute("href")) : "";
    const next = anchorHref
      ? { ...format, ...formatOf(node), link: anchorHref }
      : { ...format, ...formatOf(node) };
    for (const child of Array.from(node.childNodes)) walk(child, next);
    if (isBlock && current.length > 0) flush();
  };

  walk(root, {});
  if (current.length > 0) flush();
  return blocks;
}

export default function RichTextEditor({
  label = "Text",
  value,
  onChange,
  placeholder = "",
  minHeight = "3.25rem",
}) {
  const areaRef = useRef(null);
  const lastEmitted = useRef("");
  const savedRange = useRef(null);
  const linkInputRef = useRef(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkSelection, setLinkSelection] = useState("");
  const valueKey = JSON.stringify(normalizeRichText(value));

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    if (lastEmitted.current === valueKey) return;
    area.innerHTML = blocksToHtml(value);
    lastEmitted.current = valueKey;
  }, [value, valueKey]);

  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "div");
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!linkOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") closeLinkDialog();
    };
    document.addEventListener("keydown", onKey);
    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    return () => document.removeEventListener("keydown", onKey);
  }, [linkOpen]);

  function emit() {
    const area = areaRef.current;
    if (!area) return;
    const blocks = htmlToBlocks(area);
    lastEmitted.current = JSON.stringify(normalizeRichText(blocks));
    onChange?.(blocks);
  }

  function command(name) {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    document.execCommand(name, false, null);
    emit();
  }

  function wrap(prefix, id) {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !area.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    span.className = `${prefix}${id}`;
    span.appendChild(range.extractContents());
    span.querySelectorAll?.("[class]").forEach((node) => {
      for (const name of Array.from(node.classList)) {
        if (name.startsWith(prefix)) node.classList.remove(name);
      }
    });

    range.insertNode(span);
    selection.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    selection.addRange(after);
    emit();
  }

  function caretOffset(area) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!area.contains(range.startContainer)) return null;
    let offset = 0;
    const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node === range.startContainer) return offset + range.startOffset;
      offset += node.nodeValue.length;
      node = walker.nextNode();
    }
    return range.startContainer === area ? offset : null;
  }

  function placeCaret(area, offset) {
    const selection = window.getSelection();
    if (!selection) return;
    const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let node = walker.nextNode();
    while (node) {
      if (remaining <= node.nodeValue.length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= node.nodeValue.length;
      node = walker.nextNode();
    }
  }

  function linkifyArea() {
    const area = areaRef.current;
    if (!area) return false;
    const targets = [];
    const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement?.closest("a")) {
        const pieces = splitLinkText(node.nodeValue);
        if (pieces.some((piece) => piece.href)) targets.push({ node, pieces });
      }
      node = walker.nextNode();
    }
    if (!targets.length) return false;

    const offset = caretOffset(area);
    for (const target of targets) {
      const fragment = document.createDocumentFragment();
      for (const piece of target.pieces) {
        if (!piece.text) continue;
        if (piece.href) {
          const anchor = document.createElement("a");
          anchor.setAttribute("href", piece.href);
          if (/^https?:/i.test(piece.href)) {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noopener noreferrer");
          }
          anchor.textContent = piece.text;
          fragment.appendChild(anchor);
        } else {
          fragment.appendChild(document.createTextNode(piece.text));
        }
      }
      target.node.parentNode?.replaceChild(fragment, target.node);
    }
    if (offset !== null) placeCaret(area, offset);
    return true;
  }

  function openLinkDialog() {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const inside = Boolean(range && area.contains(range.commonAncestorContainer));
    const selectedText = inside && !range.collapsed ? range.toString().trim() : "";
    savedRange.current = inside ? range : null;
    setLinkSelection(selectedText);
    setLinkValue(/^(https?:\/\/|www\.|mailto:)/i.test(selectedText) ? selectedText : "");
    setLinkOpen(true);
  }

  function closeLinkDialog() {
    savedRange.current = null;
    setLinkOpen(false);
    setLinkValue("");
    setLinkSelection("");
  }

  function applyLink(event) {
    event?.preventDefault();
    const area = areaRef.current;
    const href = safeLinkHref(linkValue);
    if (!area || !href) return;

    area.focus();
    const selection = window.getSelection();
    const saved = savedRange.current;
    const range = saved && area.contains(saved.commonAncestorContainer) ? saved : null;

    const anchor = document.createElement("a");
    anchor.setAttribute("href", href);
    if (/^https?:/i.test(href)) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
    if (range && !range.collapsed) {
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
    } else {
      anchor.textContent = href;
      if (range) {
        range.collapse(false);
        range.insertNode(anchor);
      } else {
        area.appendChild(anchor);
      }
    }

    const after = document.createRange();
    after.setStartAfter(anchor);
    after.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(after);
    emit();
    closeLinkDialog();
  }

  function removeLink() {
    const area = areaRef.current;
    if (!area) return;
    const saved = savedRange.current;
    const start = saved?.commonAncestorContainer;
    const anchor = start ? (start.nodeType === 1 ? start : start.parentElement)?.closest("a") : null;
    if (anchor && area.contains(anchor)) {
      const parent = anchor.parentNode;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
    }
    emit();
    closeLinkDialog();
    area.focus();
  }

  function handleKeyUp(event) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (linkifyArea()) emit();
  }

  function handleBlur() {
    linkifyArea();
    emit();
  }

  function handlePaste(event) {
    const text = event.clipboardData?.getData("text/plain");
    if (text == null) return;
    event.preventDefault();
    document.execCommand("insertHTML", false, plainTextToHtml(text));
    emit();
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <button
          type="button"
          className="rte-btn"
          title="Bold (Ctrl/Cmd+B)"
          aria-label="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("bold")}
        >
          <span style={{ fontWeight: 700 }}>B</span>
        </button>
        <button
          type="button"
          className="rte-btn"
          title="Italic (Ctrl/Cmd+I)"
          aria-label="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("italic")}
        >
          <span style={{ fontStyle: "italic" }}>I</span>
        </button>
        <button
          type="button"
          className="rte-btn"
          title="Underline (Ctrl/Cmd+U)"
          aria-label="Underline"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("underline")}
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button
          type="button"
          className="rte-btn"
          title="Strikethrough"
          aria-label="Strikethrough"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("strikeThrough")}
        >
          <span style={{ textDecoration: "line-through" }}>S</span>
        </button>

        <button
          type="button"
          className="rte-btn"
          title="Add a link"
          aria-label="Add a link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLinkDialog}
        >
          <span style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>link</span>
        </button>

        <span className="rte-divider" aria-hidden="true" />

        <select
          className="rte-select"
          aria-label="Text size"
          value=""
          onChange={(event) => {
            if (event.target.value) wrap(SIZE_PREFIX, event.target.value);
          }}
        >
          <option value="">Size</option>
          {RICH_TEXT_SIZES.map((size) => (
            <option key={size.id} value={size.id}>
              {size.label}
            </option>
          ))}
        </select>

        <select
          className="rte-select"
          aria-label="Font"
          value=""
          onChange={(event) => {
            if (event.target.value) wrap(FONT_PREFIX, event.target.value);
          }}
        >
          <option value="">Font</option>
          {RICH_TEXT_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={areaRef}
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        onPaste={handlePaste}
      />

      {linkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rte-link-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 w-full h-full"
            style={{ background: "rgba(9, 6, 18, 0.55)", backdropFilter: "blur(12px)", cursor: "default" }}
            onClick={closeLinkDialog}
          />
          <form
            onSubmit={applyLink}
            className="glass-card p-6 relative w-full animate-rise"
            style={{ maxWidth: "26rem" }}
          >
            <span className="badge badge-neutral">Link</span>
            <h2 id="rte-link-title" className="font-display text-xl font-bold mt-3">
              Add a hyperlink
            </h2>
            <p className="muted text-sm mt-2 leading-relaxed">
              {linkSelection
                ? `“${linkSelection.slice(0, 80)}” will link to this address.`
                : "This address will be shown as the link text."}
            </p>
            <label className="grid gap-1 mt-4">
              <span className="faint text-xs">Address</span>
              <input
                ref={linkInputRef}
                className="input"
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://mickeychan.in or mailto:hello@mickeychan.in"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!safeLinkHref(linkValue)}
              >
                Add link
              </button>
              {linkSelection && savedRange.current && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={removeLink}>
                  Remove link
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeLinkDialog}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
