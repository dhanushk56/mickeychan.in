import { normalizeRichText, richTextRunClasses } from "@/lib/rich-text";

function Run({ run }) {
  const className = richTextRunClasses(run) || undefined;

  if (run.link) {
    const external = /^https?:/i.test(run.link);
    return (
      <a
        className={className}
        href={run.link}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {run.text}
      </a>
    );
  }

  return <span className={className}>{run.text}</span>;
}

export default function RichText({ value, className = "", blockClassName = "" }) {
  const blocks = normalizeRichText(value);
  if (!blocks.length) return null;

  return (
    <div className={`rich-text ${className}`.trim()}>
      {blocks.map((block, index) => (
        <p key={index} className={`rt-block ${blockClassName}`.trim()}>
          {block.runs.length === 0
            ? "\u00a0"
            : block.runs.map((run, runIndex) => <Run key={runIndex} run={run} />)}
        </p>
      ))}
    </div>
  );
}
