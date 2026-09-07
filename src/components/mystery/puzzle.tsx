"use client";
import { useState, useRef } from "react";
import type { PublicPuzzle } from "@/lib/shared/mystery/types";
import { Diagram } from "./art";
export function PuzzlePanel({
  puzzle,
  onAnswer,
  busy,
}: {
  puzzle: PublicPuzzle;
  onAnswer: (answer: string | string[]) => Promise<void>;
  busy: boolean;
}) {
  const p = puzzle;
  const [text, setText] = useState("");
  const [values, setValues] = useState<string[]>(
    p.type === "combination"
      ? p.fields.map(() => "")
      : p.type === "matching"
        ? p.left.map(() => "")
        : "options" in p
          ? p.options.map((o) => o.id)
          : [],
  );
  const dragged = useRef<number | null>(null),
    [picked, setPicked] = useState<number | null>(null);
  function move(from: number, to: number) {
    setValues((old) => {
      const next = [...old];
      const [a] = next.splice(from, 1);
      next.splice(to, 0, a);
      return next;
    });
    setPicked(null);
  }
  return (
    <form
      className="puzzle-form"
      onSubmit={async (e) => {
        e.preventDefault();
        await onAnswer(
          ["ordering", "tiles", "matching", "combination"].includes(p.type)
            ? values
            : text,
        );
      }}
    >
      <fieldset disabled={busy}>
        <legend>{p.instruction}</legend>
        {(p.type === "code" || p.type === "cipher") && (
          <>
            {p.type === "cipher" && <p className="cipher-strip">{p.encoded}</p>}
            <label>
              Your {p.type === "cipher" ? "decoded message" : "answer"}
              <input
                aria-label="Your answer"
                required
                maxLength={3000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                inputMode={
                  p.type === "code" && p.format === "numeric"
                    ? "numeric"
                    : "text"
                }
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </>
        )}
        {p.type === "combination" && (
          <div className="combination-fields">
            {p.fields.map((f, i) => (
              <label key={f}>
                {f}
                <input
                  required
                  maxLength={100}
                  value={values[i]}
                  onChange={(e) =>
                    setValues((v) =>
                      v.map((old, j) => (i === j ? e.target.value : old)),
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
        {p.type === "choice" && (
          <div className="puzzle-choices">
            {p.options.map((o) => (
              <label key={o.id}>
                <input
                  type="radio"
                  name="answer"
                  required
                  value={o.id}
                  checked={text === o.id}
                  onChange={() => setText(o.id)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        )}
        {p.type === "hotspot" && (
          <>
            <Diagram art={p.art} onChoose={setText} selected={text} />
            <div className="puzzle-choices">
              {p.art.objects.map((o) => (
                <label key={o.id}>
                  <input
                    type="radio"
                    name="answer"
                    required
                    checked={text === o.id}
                    onChange={() => setText(o.id)}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {p.type === "matching" && (
          <div className="matching-fields">
            {p.left.map((l, i) => (
              <label key={l.id}>
                {l.label}
                <select
                  aria-label={l.label}
                  required
                  value={values[i]}
                  onChange={(e) =>
                    setValues((v) =>
                      v.map((old, j) => (i === j ? e.target.value : old)),
                    )
                  }
                >
                  <option value="">Choose a match</option>
                  {p.right.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {(p.type === "ordering" || p.type === "tiles") && (
          <>
            <p className="muted">
              Drag to rearrange, use the Move buttons, or select two pieces to
              swap.{" "}
              {p.type === "tiles"
                ? "Read the grid across each row, starting at the top left."
                : ""}
            </p>
            <ol
              className={p.type === "tiles" ? "tile-grid" : "ordering-list"}
              style={
                p.type === "tiles"
                  ? {
                      gridTemplateColumns: `repeat(${p.columns}, minmax(0,1fr))`,
                    }
                  : undefined
              }
            >
              {values.map((id, i) => {
                const o = p.options.find((o) => o.id === id)!;
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => {
                      dragged.current = i;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragged.current !== null) move(dragged.current, i);
                      dragged.current = null;
                    }}
                  >
                    <button
                      className="piece-select"
                      type="button"
                      aria-label={`Select ${o.label}`}
                      aria-pressed={picked === i}
                      onClick={() => {
                        if (picked === null) setPicked(i);
                        else {
                          setValues((v) => {
                            const next = [...v];
                            [next[picked], next[i]] = [next[i], next[picked]];
                            return next;
                          });
                          setPicked(null);
                        }
                      }}
                    >
                      {p.type === "tiles" && o.path ? (
                        <svg
                          viewBox="0 0 100 100"
                          role="img"
                          aria-label={o.label}
                        >
                          <rect width="100" height="100" fill="#eee2c9" />
                          <path
                            d={o.path}
                            fill="none"
                            stroke="#294751"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <strong>
                          {i + 1}. {o.label}
                        </strong>
                      )}
                      {p.type === "tiles" && <span>{o.label}</span>}
                    </button>
                    <div className="piece-controls">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={i === 0}
                        aria-label={`Move ${o.label} earlier`}
                        onClick={() => move(i, i - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={i === values.length - 1}
                        aria-label={`Move ${o.label} later`}
                        onClick={() => move(i, i + 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </fieldset>
      <button className="button" disabled={busy}>
        {busy ? "Checking with Headquarters…" : "Try our answer"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
