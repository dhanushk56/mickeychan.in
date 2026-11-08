import { normalizeRichText, richTextRunClasses } from "@/lib/rich-text";

// Renders the stored block/run data as real elements. No HTML strings and no
// dangerouslySetInnerHTML — a run can only choose which of the classes in
// app/globals.css it gets, so the copy is always inert.
export default function RichText({ value, className = "", blockClassName = "" }) {
  const blocks = normalizeRichText(value);
  if (!blocks.length) return null;

  return (
    <div className={`rich-text ${className}`.trim()}>
      {blocks.map((block, index) => (
        <p key={index} className={`rt-block ${blockClassName}`.trim()}>
          {block.runs.length === 0
            ? "\u00a0"
            : block.runs.map((run, runIndex) => (
                <span key={runIndex} className={richTextRunClasses(run)}>
                  {run.text}
                </span>
              ))}
        </p>
      ))}
    </div>
  );
}
