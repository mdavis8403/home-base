"use client";
// The Mystery Club case-selection library: the approved bookshelf artwork with
// mystery titles overlaid on clear book spines (BOOK_SLOTS). Titles are rendered
// in CSS (serif, vertical) — never baked into the image. Empty slots stay
// unlabeled and non-interactive, so the shelf scales to dozens of mysteries
// without changing the artwork. Every populated spine is a keyboard-focusable
// button labelled with its mystery title.
import type { CaseCard } from "@/lib/shared/mystery/types";
import { BOOK_SLOTS } from "@/lib/shared/mystery/slots";

export function Bookshelf({
  cases,
  onChoose,
  busy,
  emptyLabel,
}: {
  cases: CaseCard[];
  onChoose: (c: CaseCard) => void;
  busy: boolean;
  emptyLabel: string;
}) {
  // Deterministic order → the current cases land in the first slots.
  const ordered = cases.slice().sort((a, b) => a.caseNumber - b.caseNumber);
  return (
    <div className="mystery-shelf">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed library art must not be re-cropped. */}
      <img
        className="mystery-shelf-art"
        src="/images/mystery-bookshelf-bg.png"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        draggable={false}
      />
      <div className="mystery-shelf-slots">
        {ordered.map((c, i) => {
          const slot = BOOK_SLOTS[i];
          if (!slot) return null;
          const isNew = !c.solved && !c.activeId && !c.completedId && c.published;
          const state = c.activeId
            ? "in progress"
            : c.solved
              ? "solved"
              : isNew
                ? "new"
                : "";
          return (
            <button
              key={c.id}
              type="button"
              className={`book-spine ${c.solved ? "is-solved" : ""} ${
                c.activeId ? "is-active" : ""
              } ${isNew ? "is-new" : ""}`}
              style={{
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.w * 100}%`,
                height: `${slot.h * 100}%`,
              }}
              disabled={busy}
              aria-label={`${c.title}${state ? " — " + state : ""}. Case ${c.caseNumber}.`}
              title={c.title}
              onClick={() => onChoose(c)}
            >
              <span className="spine-title" aria-hidden="true">
                {c.title}
              </span>
              {(c.solved || isNew) && (
                <span
                  className={`spine-mark ${c.solved ? "mark-solved" : "mark-new"}`}
                  aria-hidden="true"
                >
                  {c.solved ? "✦" : "•"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {ordered.length === 0 && <p className="mystery-shelf-empty">{emptyLabel}</p>}
    </div>
  );
}
