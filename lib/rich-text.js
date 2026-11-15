export const RICH_TEXT_SIZES = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Normal" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

export const RICH_TEXT_FONTS = [
  { id: "body", label: "Default" },
  { id: "display", label: "Display" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Monospace" },
];

const SIZE_IDS = RICH_TEXT_SIZES.map((size) => size.id);
const FONT_IDS = RICH_TEXT_FONTS.map((font) => font.id);

const MAX_BLOCKS = 120;
const MAX_RUNS = 80;
const MAX_RUN_LENGTH = 4000;
const MAX_LINK_LENGTH = 2048;

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'\u2018\u2019\u201c\u201d`]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"`]+$/;
const BARE_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/?#]|$)/i;

export function safeLinkHref(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX_LINK_LENGTH) return "";
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    if (!BARE_HOST_PATTERN.test(candidate)) return "";
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".")) return "";
    return url.href.slice(0, MAX_LINK_LENGTH);
  } catch {
    return "";
  }
}

export function splitLinkText(value) {
  const text = String(value || "");
  const pieces = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0].replace(TRAILING_PUNCTUATION, "");
    const href = raw ? safeLinkHref(raw) : "";
    if (!href || start < cursor) continue;
    if (start > cursor) pieces.push({ text: text.slice(cursor, start), href: "" });
    pieces.push({ text: raw, href });
    cursor = start + raw.length;
  }
  if (!pieces.length) return [{ text, href: "" }];
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), href: "" });
  return pieces;
}

function normalizeRun(raw) {
  const run = { text: String(raw?.text ?? "").slice(0, MAX_RUN_LENGTH) };
  if (raw?.b) run.b = true;
  if (raw?.i) run.i = true;
  if (raw?.u) run.u = true;
  if (raw?.s) run.s = true;
  if (SIZE_IDS.includes(raw?.size) && raw.size !== "md") run.size = raw.size;
  if (FONT_IDS.includes(raw?.font) && raw.font !== "body") run.font = raw.font;
  const href = safeLinkHref(raw?.link);
  if (href) run.link = href;
  return run;
}

function sameFormat(a, b) {
  return (
    Boolean(a.b) === Boolean(b.b) &&
    Boolean(a.i) === Boolean(b.i) &&
    Boolean(a.u) === Boolean(b.u) &&
    Boolean(a.s) === Boolean(b.s) &&
    (a.size || "md") === (b.size || "md") &&
    (a.font || "body") === (b.font || "body") &&
    (a.link || "") === (b.link || "")
  );
}

function pushRun(runs, run) {
  if (!run.text) return;
  const last = runs[runs.length - 1];
  if (last && sameFormat(last, run)) {
    last.text = (last.text + run.text).slice(0, MAX_RUN_LENGTH);
    return;
  }
  runs.push(run);
}

function linkifyRun(run) {
  if (run.link) return [run];
  return splitLinkText(run.text).map((piece) =>
    piece.href ? { ...run, text: piece.text, link: piece.href } : { ...run, text: piece.text }
  );
}

export function normalizeRichText(value) {
  const blocks = [];

  if (typeof value === "string") {
    value
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .slice(0, MAX_BLOCKS)
      .forEach((line) => {
        blocks.push({ runs: line ? [{ text: line.slice(0, MAX_RUN_LENGTH) }] : [] });
      });
  } else if (Array.isArray(value)) {
    for (const rawBlock of value.slice(0, MAX_BLOCKS)) {
      let runs = [];
      const rawRuns = Array.isArray(rawBlock?.runs) ? rawBlock.runs : [];
      for (const rawRun of rawRuns.slice(0, MAX_RUNS)) {
        const run = normalizeRun(rawRun);
        run.text
          .replace(/\r\n?/g, "\n")
          .split("\n")
          .forEach((line, index) => {
            if (index > 0) {
              blocks.push({ runs });
              runs = [];
            }
            if (line) pushRun(runs, { ...run, text: line });
          });
      }
      blocks.push({ runs });
    }
  }

  const linked = blocks.map((block) => {
    const runs = [];
    for (const run of block.runs) {
      for (const piece of linkifyRun(run)) pushRun(runs, piece);
    }
    return { runs };
  });

  while (linked.length && linked[linked.length - 1].runs.length === 0) linked.pop();
  return linked.slice(0, MAX_BLOCKS);
}

export function richTextIsEmpty(value) {
  return !normalizeRichText(value).some((block) => block.runs.length > 0);
}

export function richTextToPlain(value, max = 240) {
  const text = normalizeRichText(value)
    .map((block) => block.runs.map((run) => run.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function richTextRunClasses(run) {
  const classes = [];
  if (run?.b) classes.push("rt-b");
  if (run?.i) classes.push("rt-i");
  if (run?.u) classes.push("rt-u");
  if (run?.s) classes.push("rt-s");
  if (run?.link) classes.push("rt-link");
  if (run?.size && run.size !== "md") classes.push(`rt-size-${run.size}`);
  if (run?.font && run.font !== "body") classes.push(`rt-font-${run.font}`);
  return classes.join(" ");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function runToHtml(run) {
  const classes = richTextRunClasses(run);
  const text = escapeHtml(run.text);
  if (run.link) {
    const classAttr = classes ? ` class="${classes}"` : "";
    return `<a${classAttr} href="${escapeHtml(run.link)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  return classes ? `<span class="${classes}">${text}</span>` : text;
}

export function plainTextToHtml(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => {
      const html = splitLinkText(line.slice(0, MAX_RUN_LENGTH))
        .map((piece) =>
          piece.href
            ? `<a href="${escapeHtml(piece.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                piece.text
              )}</a>`
            : escapeHtml(piece.text)
        )
        .join("");
      return index === 0 ? html : `<br>${html}`;
    })
    .join("");
}

export function blocksToHtml(value) {
  const blocks = normalizeRichText(value);
  if (!blocks.length) return "";
  return blocks
    .map((block) => {
      const inner = block.runs.map(runToHtml).join("");
      return `<div>${inner || "<br>"}</div>`;
    })
    .join("");
}
