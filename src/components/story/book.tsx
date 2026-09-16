"use client";
import { useEffect, useRef, useState } from "react";
import {
  castLabels,
  type StoryBookView,
  type StoryPageView,
  type StorySummary,
} from "@/lib/shared/story/types";
function starring(cast: StorySummary["cast"]) {
  const list = cast.map((c) => castLabels[c]);
  if (list.length <= 1) return list[0] ?? "our family";
  return list.slice(0, -1).join(", ") + " & " + list[list.length - 1];
}
function longDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
export function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 820px)");
    const on = () => setPhone(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return phone;
}
function Narration({ text }: { text: string }) {
  return (
    <div className="story-prose">
      {text.split("\n\n").map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
function ArtPlate({ book }: { book: StorySummary }) {
  // Decorative placeholder standing in for future opening artwork.
  return (
    <div className="story-plate" aria-hidden="true">
      <span className="story-plate-mark">✦</span>
      <span className="story-plate-cap">{book.title}</span>
    </div>
  );
}
export function BookCover({
  book,
  onOpen,
}: {
  book: StorySummary;
  onOpen?: () => void;
}) {
  const inner = (
    <>
      <span className="cover-spine" aria-hidden="true" />
      <span className="cover-eyebrow">
        {book.status === "completed" ? "OUR BOOK" : "STILL BEING WRITTEN"}
      </span>
      <span className="cover-title">{book.title}</span>
      {book.subtitle && <span className="cover-subtitle">{book.subtitle}</span>}
      <span className="cover-foot">{starring(book.cast)}</span>
      <span className="cover-mark" aria-hidden="true">
        ✦
      </span>
    </>
  );
  if (!onOpen)
    return <div className={`book-cover ${book.status}`}>{inner}</div>;
  return (
    <button className={`book-cover ${book.status}`} onClick={onOpen}>
      {inner}
    </button>
  );
}
export function Bookshelf({
  inProgress,
  books,
  onOpen,
}: {
  inProgress: StorySummary[];
  books: StorySummary[];
  onOpen: (b: StorySummary) => void;
}) {
  return (
    <div className="story-shelf">
      {inProgress.length > 0 && (
        <section aria-label="Still being written">
          <p className="eyebrow">STILL BEING WRITTEN</p>
          <div className="shelf-row">
            {inProgress.map((b) => (
              <BookCover key={b.id} book={b} onOpen={() => onOpen(b)} />
            ))}
          </div>
        </section>
      )}
      <section aria-label="Our books">
        <p className="eyebrow">OUR BOOKS</p>
        {books.length === 0 ? (
          <p className="story-shelf-empty">
            No finished books yet. Your first story will find its home on this
            shelf.
          </p>
        ) : (
          <div className="shelf-row">
            {books.map((b) => (
              <BookCover key={b.id} book={b} onOpen={() => onOpen(b)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
export function PageTurn() {
  return (
    <div className="page-turn" role="status" aria-live="polite">
      <div className="page-turn-leaf" aria-hidden="true" />
      <p>Turning the page…</p>
    </div>
  );
}
type ReaderProps = {
  book: StoryBookView;
  reread: boolean;
  turning: boolean;
  isParent: boolean;
  onChoose: (sequence: number, choiceId: string) => void;
  onInput: (sequence: number, text: string) => void;
  onShelf: () => void;
  onAgain: () => void;
  onRevisit: () => void;
  onClose: () => void;
};
export function BookReader(props: ReaderProps) {
  const { book, reread, turning } = props;
  const [cursor, setCursor] = useState(
    reread ? 0 : Math.max(0, book.pages.length - 1),
  );
  const lastSeq = useRef(book.currentSequence);
  useEffect(() => {
    // In play mode, follow the story to each newly accepted page.
    if (!reread && book.currentSequence !== lastSeq.current) {
      setCursor(book.pages.length - 1);
      lastSeq.current = book.currentSequence;
    }
  }, [book.currentSequence, book.pages.length, reread]);
  const page = book.pages[Math.min(cursor, book.pages.length - 1)];
  const atLatest = cursor >= book.pages.length - 1;
  const live = !reread && book.status === "active" && atLatest && !turning;
  if (!page) return null;
  return (
    <div className="story-book" aria-label={book.title}>
      {turning && <PageTurn />}
      <PageBody {...props} page={page} live={live} />
      <StoryDetails book={book} isParent={props.isParent && live} />
      <nav className="book-nav" aria-label="Book navigation">
        <button
          className="book-nav-btn"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0 || turning}
          aria-label="Previous page"
        >
          ‹ Back a page
        </button>
        <span className="book-nav-page" aria-hidden="true">
          {page.kind === "ending"
            ? "The End"
            : `Chapter ${page.chapter} · Page ${page.sequence + 1}`}
        </span>
        {reread ? (
          <button
            className="book-nav-btn"
            onClick={() =>
              setCursor((c) => Math.min(book.pages.length - 1, c + 1))
            }
            disabled={atLatest || turning}
            aria-label="Next page"
          >
            Next page ›
          </button>
        ) : atLatest ? (
          <button className="book-nav-btn" onClick={props.onClose}>
            Close the book
          </button>
        ) : (
          <button
            className="book-nav-btn"
            onClick={() =>
              setCursor((c) => Math.min(book.pages.length - 1, c + 1))
            }
            aria-label="Next page"
          >
            Catch up ›
          </button>
        )}
      </nav>
    </div>
  );
}
function PageBody({
  page,
  book,
  live,
  reread,
  onChoose,
  onInput,
  onShelf,
  onAgain,
  onRevisit,
}: ReaderProps & { page: StoryPageView; live: boolean }) {
  if (page.kind === "chapter")
    return (
      <div className="chapter-divider">
        <p className="chapter-eyebrow">CHAPTER {page.chapter}</p>
        <h2 className="chapter-title">{page.chapterTitle}</h2>
        <Narration text={page.narration} />
        {live && (
          <button
            className="story-continue"
            onClick={() => onChoose(page.sequence, "continue")}
          >
            Turn the page <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    );
  if (page.kind === "ending")
    return (
      <div className="book-spread is-ending">
        <div className="book-leaf leaf-left">
          <Narration text={page.narration} />
        </div>
        <div className="book-leaf leaf-right ending-leaf">
          <p className="ending-mark">✦</p>
          <h2 className="ending-title">The End</h2>
          <p className="ending-meta">
            Finished {longDate(book.completedAt) || "today"}
          </p>
          <p className="ending-meta">Starring {starring(book.cast)}</p>
          {!reread && (
            <div className="ending-actions">
              <button className="story-btn primary" onClick={onShelf}>
                Put this book on our shelf
              </button>
              <button className="story-btn" onClick={onAgain}>
                Read it again
              </button>
              <button className="story-btn ghost" onClick={onRevisit}>
                Visit this world again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  const left =
    page.kind === "opening" ? (
      <div className="book-leaf leaf-left opening-leaf">
        <p className="chapter-eyebrow">CHAPTER ONE</p>
        <h2 className="opening-title">{book.title}</h2>
        {book.subtitle && <p className="opening-subtitle">{book.subtitle}</p>}
        <ArtPlate book={book} />
      </div>
    ) : (
      <div className="book-leaf leaf-left">
        <Narration text={page.narration} />
      </div>
    );
  const right = (
    <div className="book-leaf leaf-right interaction-leaf">
      {page.kind === "opening" && <Narration text={page.narration} />}
      {page.kind === "input" ? (
        <InputTurn page={page} live={live} onInput={onInput} />
      ) : (
        <ChoiceTurn page={page} live={live} onChoose={onChoose} />
      )}
    </div>
  );
  return (
    <div
      className={`book-spread ${page.kind === "opening" ? "is-opening" : ""}`}
    >
      {left}
      {right}
    </div>
  );
}
function ChoiceTurn({
  page,
  live,
  onChoose,
}: {
  page: StoryPageView;
  live: boolean;
  onChoose: (sequence: number, choiceId: string) => void;
}) {
  if (!live) {
    const chosen = page.choices.find((c) => c.id === page.selectedChoice);
    return (
      <div className="turn-recall">
        <p className="eyebrow">WHAT WE DID</p>
        <p className="turn-chosen">
          {chosen ? chosen.label : "The story moved on."}
        </p>
      </div>
    );
  }
  return (
    <div className="story-choices" role="group" aria-label="What do we do?">
      <p className="eyebrow">WHAT DO WE DO?</p>
      {page.choices.map((c) => (
        <button
          key={c.id}
          className={`story-choice tone-${c.tone}`}
          onClick={() => onChoose(page.sequence, c.id)}
        >
          <span className="choice-flourish" aria-hidden="true">
            ✦
          </span>
          {c.label}
        </button>
      ))}
    </div>
  );
}
function InputTurn({
  page,
  live,
  onInput,
}: {
  page: StoryPageView;
  live: boolean;
  onInput: (sequence: number, text: string) => void;
}) {
  const [text, setText] = useState("");
  if (!live) {
    return (
      <div className="turn-recall">
        <p className="eyebrow">OUR PART OF THE STORY</p>
        <p className="input-prompt">{page.inputPrompt}</p>
        <p className="turn-chosen">“{page.inputResponse || "…"}”</p>
      </div>
    );
  }
  return (
    <form
      className="story-input"
      onSubmit={(e) => {
        e.preventDefault();
        const value = text.trim();
        if (value) onInput(page.sequence, value);
      }}
    >
      <label className="input-prompt">
        {page.inputPrompt}
        <input
          type="text"
          maxLength={100}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anything you like…"
          aria-label="Add to the story"
          autoComplete="off"
        />
      </label>
      <button className="story-btn primary" disabled={!text.trim()}>
        Add it to the story <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
function StoryDetails({
  book,
  isParent,
}: {
  book: StoryBookView;
  isParent: boolean;
}) {
  return (
    <details className="story-details">
      <summary aria-label="Story details">⋯</summary>
      <div className="story-details-body">
        <p>
          <strong>{book.title}</strong>
        </p>
        <p className="muted">
          {book.adventureType} · {book.mood} · {book.lengthMode} ·{" "}
          {book.chapterCount} chapter{book.chapterCount === 1 ? "" : "s"}
        </p>
        <p className="muted">Starring {starring(book.cast)}</p>
        <p className="muted">Started {longDate(book.createdAt)}</p>
        {book.completedAt && (
          <p className="muted">Finished {longDate(book.completedAt)}</p>
        )}
        {isParent && (
          <button
            className="story-btn ghost"
            disabled
            aria-disabled="true"
            title="Coming with the storyteller"
          >
            Redo this page
          </button>
        )}
      </div>
    </details>
  );
}
