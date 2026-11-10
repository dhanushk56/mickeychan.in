"use client";

import { useEffect, useRef } from "react";
import {
  RICH_TEXT_FONTS,
  RICH_TEXT_SIZES,
  blocksToHtml,
  escapeHtml,
  normalizeRichText,
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
      (last.font || "body") === (run.font || "body");
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
    const next = { ...format, ...formatOf(node) };
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

  function handlePaste(event) {
    const text = event.clipboardData?.getData("text/plain");
    if (text == null) return;
    event.preventDefault();
    const html = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br>");
    document.execCommand("insertHTML", false, html);
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
        onBlur={emit}
        onPaste={handlePaste}
      />
    </div>
  );
}
