"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  boardLabels,
  type BoardData,
  type BoardItem,
} from "@/lib/shared/board";
import { boardRequest } from "./api";
import { BoardPicture, ResponseForm } from "./response";
// "drawing" is retired for new boards; kept only to render legacy Past Boards.
const symbols = { question: "✦", photo: "▧", drawing: "✎" };
function dateLabel(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
export function FamilyBoard() {
  const [data, setData] = useState<BoardData | null>(null),
    [error, setError] = useState("");
  const [view, setView] = useState<"today" | "past">("today");
  const [selected, setSelected] = useState<string | null>(null);
  const inFlight = useRef(false);
  // Full-screen board: hide the standard family shell while this room owns the view.
  useEffect(() => {
    document.body.classList.add("immersive");
    return () => document.body.classList.remove("immersive");
  }, []);
  const refresh = useCallback(async (open = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      let next = await boardRequest<BoardData>(
        open ? "/open" : "",
        open ? {} : undefined,
      );
      if (!next.boards.some((b) => b.today))
        next = await boardRequest<BoardData>("/open", {});
      setData(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      inFlight.current = false;
    }
  }, []);
  useEffect(() => {
    // Initial authenticated fetch synchronizes this room with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(true);
    const focus = () => void refresh(true);
    window.addEventListener("focus", focus);
    // Only reads board content while this room is visible; no presence or activity writes.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const board =
    view === "today"
      ? data?.boards.find((b) => b.today)
      : data?.boards.find((b) => b.id === selected);
  return (
    <div className="board-immersive">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed board art must not be re-cropped. */}
      <img
        className="board-art"
        src="/images/family-board-bg.png"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        draggable={false}
      />
      <header className="clubhouse-bar board-bar">
        <Link className="clubhouse-brand" href="/home">
          <span aria-hidden="true">←</span> THE CLUBHOUSE
        </Link>
        <h1 className="mystery-bar-title">
          <span aria-hidden="true">✦</span> Family Board
        </h1>
      </header>
      <div className="board-shell">
        <nav className="board-nav" aria-label="Board views">
          {(["today", "past"] as const).map((v) => (
            <button
              key={v}
              className="text-button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setSelected(null);
              }}
            >
              {v === "today" ? "Today’s Board" : "Past Boards"}
            </button>
          ))}
        </nav>
        <main className="board-stage">
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {!data && !error && (
            <p role="status" className="board-loading">
              Getting our board ready…
            </p>
          )}
          {data && view === "past" && !board && (
            <div className="board-history">
              <p className="eyebrow">LITTLE MOMENTS, KEPT FOREVER</p>
              <h2>Remember when…</h2>
              <p>A collection of our wonderfully ordinary days.</p>
              {data.boards.filter((b) => !b.today).length === 0 ? (
                <div className="empty-post">
                  <span aria-hidden="true">▧</span>
                  <h3>Our first page is still unfolding.</h3>
                  <p>Today’s board will find its home here tomorrow.</p>
                </div>
              ) : (
                <div className="history-list">
                  {data.boards
                    .filter((b) => !b.today)
                    .map((b) => (
                      <button
                        className="history-board"
                        key={b.id}
                        onClick={() => setSelected(b.id)}
                      >
                        <span className="history-symbol" aria-hidden="true">
                          {symbols[b.type]}
                        </span>
                        <span>
                          <span className="note-label">
                            {dateLabel(b.date)} · {boardLabels[b.type]}
                          </span>
                          <strong>{b.prompt}</strong>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          {data && board && (
            <>
              {view === "past" && (
                <button
                  className="text-button board-back"
                  onClick={() => setSelected(null)}
                >
                  ← All Past Boards
                </button>
              )}
              <BoardActivity
                key={board.id}
                board={board}
                timezone={data.timezone}
                onSaved={() => refresh()}
              />
            </>
          )}
        </main>
        <p className="board-tagline">
          A little silly. A little sweet. Entirely Us.
        </p>
      </div>
    </div>
  );
}
function BoardActivity({
  board,
  timezone,
  onSaved,
}: {
  board: BoardItem;
  timezone: string;
  onSaved: () => Promise<void>;
}) {
  const own = board.responses.some((r) => r.own);
  const previouslyOwn = useRef(own);
  const statusHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (own && !previouslyOwn.current)
      statusHeading.current?.focus({ preventScroll: true });
    previouslyOwn.current = own;
  }, [own]);
  const time = new Date(board.revealAt).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const canRespond = board.today && !own;
  const showAnswers = board.revealed || own;
  return (
    <div
      className={`board-activity board-activity-${
        board.revealed ? "revealed" : own ? "tucked" : "open"
      }`}
    >
      <article className="prompt-paper">
        <p className="note-label">{dateLabel(board.date)}</p>
        <p className="board-type">
          <span aria-hidden="true">{symbols[board.type]}</span>{" "}
          {boardLabels[board.type]}
        </p>
        <h2>{board.prompt}</h2>
        {canRespond && !board.revealed && (
          <>
            <p className="prompt-hint">
              {board.type === "question"
                ? "There are no wrong answers. Especially the wonderfully odd ones."
                : "A tiny glimpse of your day is a lovely thing to share."}
            </p>
            <ResponseForm board={board} onSaved={onSaved} />
          </>
        )}
        {!canRespond && (
          <div className="board-state" aria-live="polite">
            <p className="board-state-line">
              <span className="board-state-mark" aria-hidden="true">
                {board.revealed ? "✦" : "✉"}
              </span>
              <h3 ref={statusHeading} tabIndex={-1}>
                {board.revealed
                  ? "The surprise is open!"
                  : "Yours is tucked away."}
              </h3>
            </p>
            <p className="board-state-sub">
              {board.revealed
                ? "Here are our little pieces of the day, together."
                : `Everyone’s opens together when all three are in, or at ${time} (${timezone}). Until then, only you can see yours.`}
            </p>
          </div>
        )}
        <span className="paper-star" aria-hidden="true">
          ✧
        </span>
      </article>
      {showAnswers && (
        <section
          aria-label={
            board.revealed ? "Our responses" : "Your private response"
          }
          className="board-answers"
          data-count={board.responses.length}
        >
          {board.responses.length === 0 ? (
            <p className="board-answers-empty">
              Nothing tucked away this time. There’s always another little
              adventure.
            </p>
          ) : (
            board.responses.map((r, i) => (
              <article className="message-note board-answer" key={i}>
                <div className="note-top">
                  <span className="note-seal" aria-hidden="true">
                    {r.name[0]}
                  </span>
                  <div>
                    <p className="note-label">
                      {board.revealed
                        ? "A LITTLE PIECE OF OUR DAY"
                        : "ONLY YOU CAN SEE THIS"}
                    </p>
                    <h3>
                      {r.name}
                      {r.own ? " · you" : ""}
                    </h3>
                  </div>
                </div>
                <div className="note-content">
                  {r.text && <p className="note-body">{r.text}</p>}
                  {r.media && <BoardPicture media={r.media} />}
                </div>
              </article>
            ))
          )}
        </section>
      )}
      {board.revealed && canRespond && (
        <ResponseForm board={board} onSaved={onSaved} />
      )}
    </div>
  );
}
