"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_UPLOAD_BYTES,
  acceptAttribute,
  questionHint,
  questionIsVisible,
  questionRules,
  typeMeta,
  validateSection,
  visibleQuestions,
} from "@/lib/form-builder/schema";
import RichText from "@/components/RichText";

function Hint({ question }) {
  const hint = questionHint(question);
  if (!hint) return null;
  return <p className="faint text-xs mt-1">{hint}</p>;
}

function CharacterCount({ value, max }) {
  if (!max) return null;
  const used = [...String(value || "")].length;
  return (
    <p className={`faint text-xs mt-1 ${used > max ? "text-[var(--danger)]" : ""}`}>
      {used} / {max}
    </p>
  );
}

function toggled(list, label) {
  const array = Array.isArray(list) ? list : [];
  return array.includes(label) ? array.filter((entry) => entry !== label) : [...array, label];
}

function RankingField({ question, value, onChange }) {
  const labels = question.options.map((option) => option.label);
  const key = labels.join("\u0000");
  const complete = Array.isArray(value) && value.length === labels.length;
  const order = complete ? value : labels;

  // A ranking answer is the full list, so the untouched order counts as an answer.
  useEffect(() => {
    if (!complete) onChange(question.id, labels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(question.id, next);
  }

  return (
    <ol className="rank-list">
      {order.map((label, index) => (
        <li key={label} className="rank-row glass-inset">
          <span className="rank-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="flex-1 text-sm">{label}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => move(index, 1)}
            disabled={index === order.length - 1}
            aria-label={`Move ${label} down`}
          >
            ↓
          </button>
        </li>
      ))}
    </ol>
  );
}

function MatrixField({ question, value, onChange }) {
  const columns = question.options.map((option) => option.label);
  const rows = (question.rows || []).map((row) => row.label);
  const answers = value && typeof value === "object" ? value : {};
  const pick = (row, column) => onChange(question.id, { ...answers, [row]: column });

  return (
    <div className="matrix-wrap">
      <table className="matrix-grid">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Row</span>
            </th>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <th scope="row">{row}</th>
              {columns.map((column) => (
                <td key={column}>
                  <input
                    type="radio"
                    className="checkbox"
                    name={`${question.id}-${row}`}
                    checked={answers[row] === column}
                    onChange={() => pick(row, column)}
                    aria-label={`${row}: ${column}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignatureField({ question, value, onChange }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  function pointOf(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [
      Math.round(((event.clientX - rect.left) / rect.width) * 600),
      Math.round(((event.clientY - rect.top) / rect.height) * 200),
    ];
  }

  function segment(from, to) {
    const context = canvasRef.current.getContext("2d");
    context.beginPath();
    context.moveTo(from[0], from[1]);
    context.lineTo(to[0], to[1]);
    context.strokeStyle = "#f4f0ff";
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  }

  function start(event) {
    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);
    drawing.current = true;
    const point = pointOf(event);
    strokes.current.push([point]);
    segment(point, [point[0] + 0.1, point[1] + 0.1]);
  }

  function move(event) {
    if (!drawing.current) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const point = pointOf(event);
    const last = stroke[stroke.length - 1];
    stroke.push(point);
    segment(last, point);
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    const path = strokes.current
      .map((stroke) => stroke.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" "))
      .join(" ");
    onChange(question.id, path.length >= 12 ? { kind: "signature", path } : "");
  }

  function clear() {
    strokes.current = [];
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange(question.id, "");
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="signature-pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerLeave={finish}
        onPointerCancel={finish}
        aria-label="Signature pad"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="faint text-xs">{value?.path ? "Signature captured." : "Sign above."}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}

function FileField({ question, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = value && typeof value === "object" && value.kind === "upload" ? value : null;
  const link = typeof value === "string" ? value : "";

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Keep files under ${Math.round(MAX_UPLOAD_BYTES / 1024)} KB.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/form-builder/uploads", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not upload that file.");
      onChange(question.id, {
        kind: "upload",
        id: result.id,
        name: result.name,
        size: result.size,
        type: result.type,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {upload ? (
        <div className="glass-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <span className="min-w-0 break-all">{upload.name}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(question.id, "")}
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="btn btn-secondary btn-sm self-start">
          {busy ? "Uploading…" : "Choose a file"}
          <input
            type="file"
            className="sr-only"
            accept={acceptAttribute(question)}
            onChange={pick}
            disabled={busy}
          />
        </label>
      )}
      <input
        type="url"
        className="input"
        placeholder="Or paste a link (Drive, Dropbox, WeTransfer)"
        value={link}
        onChange={(event) => onChange(question.id, event.target.value)}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function QuestionField({ question, value, onChange, error }) {
  const setValue = (next) => onChange(question.id, next);
  const meta = typeMeta(question.type);
  const rules = questionRules(question);
  const scale = question.scale || { min: 1, max: 5 };

  return (
    <div className="glass-card p-5">
      <p className="font-display font-bold">
        {question.title || "Untitled question"}
        {question.required && <span style={{ color: "var(--accent)" }}> *</span>}
      </p>
      <RichText value={question.description} className="muted text-sm mt-1" />

      <div className="mt-3">
        {meta.kind === "text" && question.type === "short_answer" && (
          <>
            <input
              className="input"
              value={value || ""}
              maxLength={rules.maxChars ? rules.maxChars + 50 : undefined}
              onChange={(event) => setValue(event.target.value)}
            />
            <CharacterCount value={value} max={rules.maxChars} />
          </>
        )}

        {meta.kind === "text" && question.type === "paragraph" && (
          <>
            <textarea
              className="textarea"
              rows={5}
              value={value || ""}
              onChange={(event) => setValue(event.target.value)}
            />
            <CharacterCount value={value} max={rules.maxChars} />
          </>
        )}

        {meta.kind === "email" && (
          <input
            type="email"
            className="input"
            autoComplete="email"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {meta.kind === "url" && (
          <input
            type="url"
            className="input"
            placeholder="https://"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {meta.kind === "phone" && (
          <input
            type="tel"
            className="input"
            autoComplete="tel"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {meta.kind === "number" && (
          <input
            type="number"
            className="input"
            value={value === undefined || value === null ? "" : value}
            onChange={(event) =>
              setValue(event.target.value === "" ? "" : Number(event.target.value))
            }
          />
        )}

        {question.type === "multiple_choice" && (
          <div className="grid gap-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  className="checkbox"
                  name={question.id}
                  checked={value === option.label}
                  onChange={() => setValue(option.label)}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}

        {(question.type === "checkboxes" || question.type === "multi_select") && (
          <div className="grid gap-2">
            {question.options.map((option) => {
              const checked = Array.isArray(value) && value.includes(option.label);
              return (
                <label key={option.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={checked}
                    onChange={() => setValue(toggled(value, option.label))}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        )}

        {question.type === "dropdown" && (
          <select
            className="select"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="">Choose…</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {meta.kind === "scale" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: Math.max(0, scale.max - scale.min + 1) }, (_, i) => scale.min + i).map(
                (n) => (
                  <label
                    key={n}
                    className="glass-inset flex min-w-[2.75rem] flex-col items-center gap-1 px-3 py-2 text-xs muted"
                    style={
                      value === n
                        ? { borderColor: "var(--primary)", color: "var(--primary)" }
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      className="checkbox"
                      name={question.id}
                      checked={value === n}
                      onChange={() => setValue(n)}
                    />
                    {n}
                  </label>
                )
              )}
            </div>
            {(scale.minLabel || scale.maxLabel) && (
              <div className="flex justify-between text-xs faint mt-2">
                <span>{scale.minLabel}</span>
                <span>{scale.maxLabel}</span>
              </div>
            )}
          </div>
        )}

        {meta.kind === "rating" && (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Rating">
            {Array.from({ length: rules.ratingMax }, (_, i) => i + 1).map((n) => {
              const active = Number(value) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  className="rating-star"
                  data-active={active}
                  aria-pressed={Number(value) === n}
                  aria-label={`${n} of ${rules.ratingMax}`}
                  onClick={() => setValue(n)}
                >
                  ★
                </button>
              );
            })}
          </div>
        )}

        {meta.kind === "date" && (
          <input
            type="date"
            className="input"
            min={rules.minDate || undefined}
            max={rules.maxDate || undefined}
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {meta.kind === "time" && (
          <input
            type="time"
            className="input"
            value={value || ""}
            onChange={(event) => setValue(event.target.value)}
          />
        )}

        {meta.kind === "ranking" && (
          <RankingField question={question} value={value} onChange={onChange} />
        )}

        {meta.kind === "matrix" && (
          <MatrixField question={question} value={value} onChange={onChange} />
        )}

        {meta.kind === "signature" && (
          <SignatureField question={question} value={value} onChange={onChange} />
        )}

        {meta.kind === "file" && (
          <FileField question={question} value={value} onChange={onChange} />
        )}
      </div>

      <Hint question={question} />

      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function FormRenderer({ form, mode = "fill", onSubmit, submitting = false }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [previewNotice, setPreviewNotice] = useState("");

  const sections = form.sections || [];
  const section = sections[sectionIndex];
  const isLastSection = sectionIndex === sections.length - 1;
  const allQuestions = sections.flatMap((entry) => entry.questions || []);

  function updateResponse(id, value) {
    setResponses((previous) => ({ ...previous, [id]: value }));
    // Clear a message as soon as the answer changes, so it never outlives its cause.
    setErrors((previous) => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  function goNext() {
    const sectionErrors = validateSection(section, responses, allQuestions);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }
    setErrors({});
    setSectionIndex((index) => Math.min(index + 1, sections.length - 1));
  }

  function goBack() {
    setErrors({});
    setSectionIndex((index) => Math.max(index - 1, 0));
  }

  function handleSubmit() {
    const allErrors = {};
    for (const entry of sections) {
      Object.assign(allErrors, validateSection(entry, responses, allQuestions));
    }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstSection = sections.findIndex((entry) =>
        entry.questions?.some((question) => allErrors[question.id])
      );
      if (firstSection >= 0) setSectionIndex(firstSection);
      return;
    }
    if (mode === "preview") {
      setPreviewNotice("Preview only. Responses aren't saved.");
      return;
    }

    // Answers to questions hidden by a condition are not part of the submission.
    const visible = {};
    for (const question of allQuestions) {
      if (!questionIsVisible(question, responses, allQuestions)) continue;
      if (responses[question.id] !== undefined) visible[question.id] = responses[question.id];
    }
    onSubmit?.(visible);
  }

  if (!section) return null;

  return (
    <div className="grid gap-4" style={{ maxWidth: "44rem", marginInline: "auto", width: "100%" }}>
      <div className="glass-card p-6">
        <p className="kicker">Application</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold mt-2">{form.title}</h1>
        <RichText value={form.description} className="muted mt-2 leading-relaxed" />
      </div>

      {sections.length > 1 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--glass-edge)" }}>
            <div
              className="h-1 rounded-full transition-all"
              style={{
                width: `${((sectionIndex + 1) / sections.length) * 100}%`,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
              }}
            />
          </div>
          <p className="faint text-xs whitespace-nowrap">
            {sectionIndex + 1} / {sections.length}
            {section.title ? ` · ${section.title}` : ""}
          </p>
        </div>
      )}

      <RichText value={section.description} className="muted text-sm" />

      {visibleQuestions(section.questions, responses, allQuestions).map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={responses[question.id]}
          onChange={updateResponse}
          error={errors[question.id]}
        />
      ))}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} disabled={sectionIndex === 0} className="btn btn-secondary">
          Back
        </button>
        {isLastSection ? (
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
            {submitting ? "Submitting…" : form.submitLabel || "Submit"}
          </button>
        ) : (
          <button type="button" onClick={goNext} className="btn btn-primary">
            Next
          </button>
        )}
      </div>

      {previewNotice && <p className="faint text-sm text-center">{previewNotice}</p>}
    </div>
  );
}
