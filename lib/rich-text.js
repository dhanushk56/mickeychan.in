
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

function normalizeRun(raw) {
  const run = { text: String(raw?.text ?? "").slice(0, MAX_RUN_LENGTH) };
  if (raw?.b) run.b = true;
  if (raw?.i) run.i = true;
  if (raw?.u) run.u = true;
  if (raw?.s) run.s = true;
  if (SIZE_IDS.includes(raw?.size) && raw.size !== "md") run.size = raw.size;
  if (FONT_IDS.includes(raw?.font) && raw.font !== "body") run.font = raw.font;
  return run;
}

function sameFormat(a, b) {
  return (
    Boolean(a.b) === Boolean(b.b) &&
    Boolean(a.i) === Boolean(b.i) &&
    Boolean(a.u) === Boolean(b.u) &&
    Boolean(a.s) === Boolean(b.s) &&
    (a.size || "md") === (b.size || "md") &&
    (a.font || "body") === (b.font || "body")
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

  while (blocks.length && blocks[blocks.length - 1].runs.length === 0) blocks.pop();
  return blocks.slice(0, MAX_BLOCKS);
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

export function blocksToHtml(value) {
  const blocks = normalizeRichText(value);
  if (!blocks.length) return "";
  return blocks
    .map((block) => {
      const inner = block.runs
        .map((run) => {
          const classes = richTextRunClasses(run);
          const text = escapeHtml(run.text);
          return classes ? `<span class="${classes}">${text}</span>` : text;
        })
        .join("");
      return `<div>${inner || "<br>"}</div>`;
    })
    .join("");
}
