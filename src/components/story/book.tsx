"use client";
/* eslint-disable @next/next/no-img-element -- local approved story artwork, not remote/optimizable */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  castLabels,
  type StoryBookView,
  type StoryPageView,
  type StorySummary,
} from "@/lib/shared/story/types";
import { paginateParagraphs, pairColumns } from "@/lib/shared/story/paginate";

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
function paragraphs(text: string): string[] {
  return text.split("\n\n").filter((p) => p.trim().length > 0);
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

// ---- Reading model -------------------------------------------------------
// Each server page expands into one or more printed "spreads" so that long
// narration paginates across pages instead of being clipped or shrunk. A leaf
// holds an ordered list of slots (title, prose, choices, input, ending).
type Slot =
  | { t: "title"; page: StoryPageView }
  | { t: "prose"; page: StoryPageView; paras: string[]; drop: boolean }
  | { t: "choices"; page: StoryPageView }
  | { t: "input"; page: StoryPageView }
  | { t: "ending"; page: StoryPageView };

type Variant =
  | "opening"
  | "normal"
  | "narration"
  | "interaction"
  | "chapter"
  | "ending";

interface Spread {
  id: string;
  page: StoryPageView;
  variant: Variant;
  left: Slot[];
  right: Slot[];
}

function interactionSlot(page: StoryPageView): Slot | null {
  if (page.kind === "input") return { t: "input", page };
  if (page.choices.length > 0) return { t: "choices", page };
  return null;
}

// Build the printed spreads for one server page. `fitsFull` tests whether a set
// of paragraphs fits a whole leaf, used to paginate long narration.
function spreadsForPage(
  page: StoryPageView,
  drop: boolean,
  fitsFull: (paras: string[]) => boolean,
): Spread[] {
  const id = (suffix: string): string => `${page.id}:${suffix}`;
  const paras = paragraphs(page.narration);
  const interaction = interactionSlot(page);

  if (page.kind === "chapter") {
    return [{ id: id("chapter"), page, variant: "chapter", left: [], right: [] }];
  }

  if (page.kind === "opening") {
    // The title page (left) faces the opening narration and its choices (right)
    // as one spread — the reader always sees where the story begins and how to
    // step into it. The facing page contains itself if the prose runs long.
    const right: Slot[] = [{ t: "prose", page, paras, drop: true }];
    if (interaction) right.push(interaction);
    return [
      {
        id: id("open"),
        page,
        variant: "opening",
        left: [{ t: "title", page }],
        right,
      },
    ];
  }

  if (page.kind === "ending") {
    const cols = paginateParagraphs(paras, fitsFull);
    const last = cols[cols.length - 1] ?? [];
    const front = cols.slice(0, -1);
    const spreads: Spread[] = [];
    flowColumns(spreads, front, page, id);
    spreads.push({
      id: id("end"),
      page,
      variant: "ending",
      left: [{ t: "prose", page, paras: last, drop }],
      right: [{ t: "ending", page }],
    });
    return spreads;
  }

  const isDecision = page.choices.length > 1;
  const isScene = page.kind === "choice" && page.choices.length === 1;
  // A narration-advance "scene" flows its prose across both printed pages (never
  // hiding a paragraph); the reader turns the page from the desk nav below. A
  // historical input page shows narration + its recollection on one spread.
  if (isScene) {
    const spreads: Spread[] = [];
    flowColumns(spreads, paginateParagraphs(paras, fitsFull), page, id);
    return spreads;
  }
  if (!isDecision) {
    return [
      {
        id: id("read"),
        page,
        variant: "normal",
        left: [{ t: "prose", page, paras, drop }],
        right: interaction ? [interaction] : [],
      },
    ];
  }
  // A meaningful decision: narration left, choices right. Long setup prose flows
  // across both leaves and the choices move to their own following spread.
  const cols = paginateParagraphs(paras, fitsFull);
  if (cols.length <= 1) {
    return [
      {
        id: id("read"),
        page,
        variant: "normal",
        left: [{ t: "prose", page, paras: cols[0], drop }],
        right: interaction ? [interaction] : [],
      },
    ];
  }
  const spreads: Spread[] = [];
  flowColumns(spreads, cols, page, id);
  if (interaction)
    spreads.push({
      id: id("act"),
      page,
      variant: "interaction",
      left: [],
      right: [interaction],
    });
  return spreads;
}

function flowColumns(
  spreads: Spread[],
  cols: string[][],
  page: StoryPageView,
  id: (s: string) => string,
): void {
  pairColumns(cols).forEach(([a, b], i) => {
    spreads.push({
      id: id(`flow${spreads.length}-${i}`),
      page,
      variant: "narration",
      left: [{ t: "prose", page, paras: a, drop: false }],
      right: b ? [{ t: "prose", page, paras: b, drop: false }] : [],
    });
  });
}

function buildSpreads(
  book: StoryBookView,
  fitsFull: (paras: string[]) => boolean,
): Spread[] {
  const out: Spread[] = [];
  book.pages.forEach((page, i) => {
    const prev = book.pages[i - 1];
    const drop = page.kind === "opening" || prev?.kind === "chapter";
    out.push(...spreadsForPage(page, drop, fitsFull));
  });
  return out;
}

// ---- Prose + interaction pieces -----------------------------------------
function Prose({ paras, drop }: { paras: string[]; drop: boolean }) {
  return (
    <div className={`story-prose${drop ? " has-drop" : ""}`}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function ArtPlate() {
  // The illustration frame stays reserved for future generated artwork; while
  // there is none we render nothing (an empty framed box reads as missing art).
  return null;
}

export function BookCover({
  book,
  onOpen,
}: {
  book: StorySummary;
  onOpen?: () => void;
}) {
  const inner = (
    <span className="cover-plate">
      <span className="cover-eyebrow">
        {book.status === "completed" ? "OUR BOOK" : "STILL BEING WRITTEN"}
      </span>
      <span className="cover-title">{book.title}</span>
      {book.subtitle && <span className="cover-subtitle">{book.subtitle}</span>}
      <span className="cover-foot">{starring(book.cast)}</span>
    </span>
  );
  if (!onOpen)
    return <div className={`book-cover ${book.status}`}>{inner}</div>;
  return (
    <button
      className={`book-cover ${book.status}`}
      onClick={onOpen}
      aria-label={`Open ${book.title}`}
    >
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
  // The desk adapts to how many finished books there are: one book sits large
  // and central; a handful lie hand-placed; many tidy into a desk collection.
  const shelfCount = Math.min(books.length, 6);
  return (
    <div className="story-shelf">
      <section aria-label="Our books" className="shelf-finished">
        <p className="eyebrow">OUR BOOKS</p>
        {books.length === 0 ? (
          <p className="story-shelf-empty">
            No finished books yet. Your first story will find its home on this
            desk.
          </p>
        ) : (
          <div className="shelf-row" data-count={shelfCount}>
            {books.map((b) => (
              <BookCover key={b.id} book={b} onOpen={() => onOpen(b)} />
            ))}
          </div>
        )}
      </section>
      {inProgress.length > 0 && (
        <section aria-label="Still being written" className="shelf-progress">
          <p className="eyebrow">STILL BEING WRITTEN</p>
          <div className="shelf-row" data-count={Math.min(inProgress.length, 6)}>
            {inProgress.map((b) => (
              <BookCover key={b.id} book={b} onOpen={() => onOpen(b)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function PageTurn() {
  return (
    <div className="page-turn" role="status" aria-live="polite">
      <img
        className="page-turn-flourish"
        src="/images/our-story-ink-flourish.png"
        alt=""
        aria-hidden="true"
      />
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
  onShelf: () => void;
  onAgain: () => void;
  onClose: () => void;
};

export function BookReader(props: ReaderProps) {
  const { book, reread, turning } = props;
  const frameRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Measurement generation: bumped when the leaf size changes so spreads are
  // recomputed against the real printed page. Spreads start from a naive
  // one-page-per-spread build so the first paint is always correct for short
  // content; measurement only ever *adds* pages for overflowing prose.
  const [spreads, setSpreads] = useState<Spread[]>(() =>
    buildSpreads(book, () => true),
  );
  const [cursor, setCursor] = useState(0);
  // Track the last story position we followed to, so play mode advances the
  // reader to each new page exactly once (and resizes never move the cursor).
  const seenSeq = useRef<number | null>(null);

  const rebuild = useCallback(() => {
    const box = measureRef.current;
    const maxH = box?.clientHeight ?? 0;
    let next: Spread[];
    if (!box || maxH <= 1) {
      // No measurable page (phone single-page layout hides the measurer): keep
      // one spread per server page and let the printed page scroll internally.
      next = buildSpreads(book, () => true);
    } else {
      const fit = (paras: string[]): boolean => {
        if (paras.length === 0) return true;
        box.innerHTML = paras
          .map(
            (p) =>
              `<p>${p
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</p>`,
          )
          .join("");
        return box.scrollHeight <= maxH + 1;
      };
      next = buildSpreads(book, fit);
    }
    setSpreads(next);
    // Advance to the first spread of the latest page when the story moves on.
    // Derived from the freshly built spreads so it never uses stale geometry.
    if (!reread && book.currentSequence !== seenSeq.current) {
      const lastSeq = book.pages[book.pages.length - 1]?.sequence ?? 0;
      const first = next.findIndex((s) => s.page.sequence === lastSeq);
      setCursor(first < 0 ? Math.max(0, next.length - 1) : first);
      seenSeq.current = book.currentSequence;
    }
  }, [book, reread]);

  useLayoutEffect(() => {
    rebuild();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => rebuild());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [rebuild]);

  const lastSeq = book.pages[book.pages.length - 1]?.sequence ?? 0;
  const latestSpreadIndices = spreads
    .map((s, i) => (s.page.sequence === lastSeq ? i : -1))
    .filter((i) => i >= 0);
  const lastLatest = latestSpreadIndices[latestSpreadIndices.length - 1] ?? 0;

  const clamped = Math.min(cursor, spreads.length - 1);
  const spread = spreads[clamped];
  if (!spread) return null;
  const onLatestPage = spread.page.sequence === lastSeq;
  const live = !reread && book.status === "active" && onLatestPage && !turning;

  const goBack = () => setCursor((c) => Math.max(0, Math.min(c, clamped) - 1));
  const canBack = clamped > 0;

  let forward: { label: string; onClick: () => void } | null = null;
  if (reread) {
    if (clamped < spreads.length - 1)
      forward = {
        label: "Next page ›",
        onClick: () => setCursor(clamped + 1),
      };
  } else if (!onLatestPage) {
    forward = { label: "Catch up ›", onClick: () => setCursor(lastLatest) };
  } else if (clamped < lastLatest) {
    forward = {
      label: "Turn the page ›",
      onClick: () => setCursor(clamped + 1),
    };
  } else if (
    live &&
    spread.page.kind === "choice" &&
    spread.page.choices.length === 1
  ) {
    // A narration "scene": the family reads the spread, then turns the page and
    // the story advances (the decision pages carry their choices in the leaf).
    const c = spread.page.choices[0];
    forward = {
      label: `${c.label} ›`,
      onClick: () => props.onChoose(spread.page.sequence, c.id),
    };
  }

  return (
    <div className="story-reader">
      <div
        className="story-book book-frame reading"
        ref={frameRef}
        aria-label={book.title}
      >
        {turning && <PageTurn />}
        <SpreadView spread={spread} live={live} {...props} />
        <StoryDetails book={book} isParent={props.isParent && live} />
        {/* Hidden measurer sized to one printed leaf; container queries resolve
            against the same frame so wrapping matches the real page exactly. */}
        <div className="leaf-measure" aria-hidden="true">
          <div className="story-prose" ref={measureRef} />
        </div>
      </div>
      <nav className="book-nav" aria-label="Book navigation">
        <button
          className="book-nav-btn"
          onClick={goBack}
          disabled={!canBack || turning}
          aria-label="Previous page"
        >
          ‹ Back a page
        </button>
        <span className="book-nav-page" aria-hidden="true">
          {spread.variant === "ending"
            ? "The End"
            : spread.variant === "chapter"
              ? `Chapter ${spread.page.chapter}`
              : `Chapter ${spread.page.chapter} · Page ${spread.page.sequence + 1}`}
        </span>
        {forward ? (
          <button
            className="book-nav-btn"
            onClick={forward.onClick}
            disabled={turning}
          >
            {forward.label}
          </button>
        ) : reread ? (
          <span className="book-nav-page" aria-hidden="true">
            The End
          </span>
        ) : (
          <button className="book-nav-btn" onClick={props.onClose}>
            Close the book
          </button>
        )}
      </nav>
    </div>
  );
}

function SpreadView({
  spread,
  live,
  reread,
  onChoose,
  onShelf,
  onAgain,
  book,
}: ReaderProps & { spread: Spread; live: boolean }) {
  if (spread.variant === "chapter") {
    const page = spread.page;
    return (
      <div className="chapter-divider">
        <p className="chapter-eyebrow">CHAPTER {page.chapter}</p>
        <h2 className="chapter-title">{page.chapterTitle}</h2>
        <img
          className="chapter-ornament"
          src="/images/our-story-chapter-divider.png"
          alt=""
          aria-hidden="true"
        />
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
  }
  const renderSlot = (slot: Slot, key: number) => {
    switch (slot.t) {
      case "title":
        return (
          <div className="title-block" key={key}>
            <p className="chapter-eyebrow">CHAPTER ONE</p>
            <h2 className="opening-title">{book.title}</h2>
            {book.subtitle && (
              <p className="opening-subtitle">{book.subtitle}</p>
            )}
            <img
              className="opening-ornament"
              src="/images/our-story-title-ornament.png"
              alt=""
              aria-hidden="true"
            />
            <ArtPlate />
          </div>
        );
      case "prose":
        return <Prose key={key} paras={slot.paras} drop={slot.drop} />;
      case "choices":
        return (
          <Interaction
            key={key}
            page={slot.page}
            live={live}
            onChoose={onChoose}
          />
        );
      case "input":
        return <InputRecall key={key} page={slot.page} />;
      case "ending":
        return (
          <EndingBlock
            key={key}
            book={book}
            reread={reread}
            onShelf={onShelf}
            onAgain={onAgain}
          />
        );
    }
  };
  return (
    <div className={`book-spread variant-${spread.variant}`}>
      <div className="book-leaf leaf-left">
        {spread.left.map((s, i) => renderSlot(s, i))}
      </div>
      <div className="book-leaf leaf-right">
        {spread.right.map((s, i) => renderSlot(s, i))}
      </div>
    </div>
  );
}

function EndingBlock({
  book,
  reread,
  onShelf,
  onAgain,
}: {
  book: StoryBookView;
  reread: boolean;
  onShelf: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="ending-block">
      <h2 className="ending-title">The End</h2>
      <img
        className="ending-ornament"
        src="/images/our-story-ending-ornament.png"
        alt=""
        aria-hidden="true"
      />
      <p className="ending-meta">
        Finished {longDate(book.completedAt) || "today"}
      </p>
      <p className="ending-meta">Starring {starring(book.cast)}</p>
      {!reread && (
        <div className="ending-actions">
          <button className="story-btn primary shelf-btn" onClick={onShelf}>
            Put this book on our shelf
          </button>
          <div className="ending-links">
            <button className="ink-link" onClick={onAgain}>
              Read it again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// A story interaction: a single-option page is a quiet "Turn the page"; a
// multi-option page is a meaningful decision (or a recollection when re-read).
function Interaction({
  page,
  live,
  onChoose,
}: {
  page: StoryPageView;
  live: boolean;
  onChoose: (sequence: number, choiceId: string) => void;
}) {
  const single = page.choices.length === 1;
  if (single) {
    if (!live) return null; // a narration page being re-read is just prose
    const c = page.choices[0];
    return (
      <button
        className="story-continue page-continue"
        onClick={() => onChoose(page.sequence, c.id)}
      >
        {c.label} <span aria-hidden="true">→</span>
      </button>
    );
  }
  if (!live) {
    const chosen = page.choices.find((c) => c.id === page.selectedChoice);
    return (
      <div className="turn-recall">
        <p className="recall-eyebrow">WHAT WE DID</p>
        <p className="recall-line">
          {chosen ? chosen.label : "The story moved on."}
        </p>
      </div>
    );
  }
  return (
    <div className="story-choices" role="group" aria-label="What do we do?">
      <p className="choices-eyebrow">WHAT DO WE DO?</p>
      {page.choices.map((c) => (
        <button
          key={c.id}
          className={`story-choice tone-${c.tone}`}
          onClick={() => onChoose(page.sequence, c.id)}
        >
          <span className="choice-flourish" aria-hidden="true">
            ✦
          </span>
          <span className="choice-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

// Historical family-input pages remain readable as a printed annotation.
function InputRecall({ page }: { page: StoryPageView }) {
  return (
    <div className="turn-recall input-recall">
      <p className="recall-eyebrow">OUR PART OF THE STORY</p>
      <p className="recall-prompt">{page.inputPrompt}</p>
      <p className="recall-quote">“{page.inputResponse || "…"}”</p>
    </div>
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
      <summary aria-label="Story details">
        <span aria-hidden="true">⋯</span>
      </summary>
      <div className="story-details-body">
        <p>
          <strong>{book.title}</strong>
        </p>
        <p className="muted">
          {book.adventureType === "mixer"
            ? "Made from 30 family ingredients"
            : `${book.adventureType} · ${book.mood} · ${book.lengthMode}`}
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
