"use client";
/* eslint-disable @next/next/no-img-element -- private and local images bypass image optimization */
import { useEffect, useRef, useState } from "react";
import { Doodle } from "@/components/messages/doodle";
import { base64 } from "@/components/messages/api";
import { boardRequest } from "./api";
import type { BoardItem } from "@/lib/shared/board";
export function ResponseForm({
  board,
  onSaved,
}: {
  board: BoardItem;
  onSaved: () => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [blob, setBlob] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [drawing, setDrawing] = useState(false);
  const lock = useRef(false);
  const startDrawing = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Synchronize a browser-owned object URL and release it when the blob changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  function chooseFile(file: File | undefined, kind: string) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(`Choose a ${kind} smaller than 8 MB.`);
      return;
    }
    setError("");
    setBlob(file);
  }
  const needsMedia = board.type !== "question";
  return (
    <form
      className="entry-form board-response"
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        setError("");
        if (needsMedia && !blob) {
          setError("Choose your photo or use your drawing first.");
          return;
        }
        lock.current = true;
        setBusy(true);
        try {
          await boardRequest("/respond", {
            boardId: board.id,
            text,
            attachment: blob
              ? {
                  kind: board.type === "photo" ? "photo" : "doodle",
                  data: await base64(blob),
                  altText: alt,
                }
              : null,
          });
          await onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please try again.");
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend className="visually-hidden">
          {board.revealed ? "Add your little piece" : "Your little secret"}
        </legend>
        {board.type === "question" ? (
          <label className="board-field">
            <span className="field-label">Your answer</span>
            <textarea
              required
              maxLength={3000}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A wild idea? A little thought? Anything goes."
            />
          </label>
        ) : blob ? (
          <div className="media-preview">
            {preview && (
              <img src={preview} alt={alt || "Your private picture preview"} />
            )}
            <label className="board-field">
              <span className="field-label">Describe your picture</span>
              <textarea
                required
                rows={2}
                maxLength={1000}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="A few words so everyone can enjoy it."
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setBlob(null);
                setPreview("");
              }}
            >
              Choose again
            </button>
          </div>
        ) : board.type === "photo" ? (
          <label className="file-picker board-pick">
            Choose your photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => chooseFile(e.target.files?.[0], "photo")}
            />
            <span className="muted">
              One photo, just from you. JPEG, PNG or WebP · up to 8 MB.
            </span>
          </label>
        ) : (
          <div className="board-pick">
            <button
              type="button"
              className="button"
              ref={startDrawing}
              onClick={() => setDrawing(true)}
            >
              Start Drawing <span aria-hidden="true">✎</span>
            </button>
            <label className="file-picker">
              Or choose a drawing file
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => chooseFile(e.target.files?.[0], "drawing")}
              />
              <span className="muted">JPEG, PNG or WebP · up to 8 MB.</span>
            </label>
          </div>
        )}
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {(!needsMedia || blob) && (
        <>
          <p className="muted board-response-note">
            {board.revealed
              ? "The board is open. Your response will join the others right away."
              : "Once tucked away, your response stays yours until the big reveal."}
          </p>
          <button className="button" disabled={busy}>
            {busy
              ? "Tucking it away…"
              : board.revealed
                ? "Add to our board"
                : "Tuck mine away"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </>
      )}
      {drawing && (
        <DrawingOverlay
          onCancel={() => {
            setDrawing(false);
            startDrawing.current?.focus();
          }}
          onUse={(b) => {
            setBlob(b);
            setDrawing(false);
            startDrawing.current?.focus();
          }}
        />
      )}
    </form>
  );
}
function DrawingOverlay({
  onCancel,
  onUse,
}: {
  onCancel: () => void;
  onUse: (blob: Blob) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [timer, setTimer] = useState(true),
    [deadline, setDeadline] = useState<number | null>(null),
    [seconds, setSeconds] = useState(60);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (!timer || deadline === null) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer, deadline]);
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = dialog.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  return (
    <div
      className="drawing-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Drawing challenge"
      ref={dialog}
      onKeyDown={onKeyDown}
    >
      <div className="drawing-overlay-inner">
        <div className="drawing-overlay-head">
          <h2 tabIndex={-1} ref={heading}>
            Your drawing
          </h2>
          <button type="button" className="text-button" onClick={onCancel}>
            ← Back to board
          </button>
        </div>
        <label className="timer-choice">
          <input
            type="checkbox"
            checked={timer}
            onChange={(e) => {
              setTimer(e.target.checked);
              setDeadline(null);
              setSeconds(60);
            }}
          />{" "}
          Play with a 60-second timer
        </label>
        {timer && (
          <div className="message-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSeconds(60);
                setDeadline(Date.now() + 60_000);
              }}
            >
              {deadline === null ? "Start timer" : "Restart timer"}
            </button>
            <span className="drawing-time" role="timer" aria-label="Time left">
              {seconds}s
            </span>
          </div>
        )}
        {timer && seconds === 0 && (
          <p role="status">
            Ding! Keep drawing if you like. This is just for fun.
          </p>
        )}
        <Doodle
          onSave={onUse}
          helpText="Draw with a finger, stylus, or mouse, then use your drawing. You can also choose a drawing file back on the board."
        />
      </div>
    </div>
  );
}
export function BoardPicture({
  media,
}: {
  media: NonNullable<BoardItem["responses"][number]["media"]>;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    boardRequest<{ url: string }>("/media/" + media.id)
      .then((r) => {
        if (active) setUrl(r.url);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [media.id]);
  return (
    <div className="message-attachment">
      {url ? (
        <img
          src={url}
          alt={media.metadata.altText}
          onError={() => {
            setUrl("");
            setError("This picture needs a fresh link.");
          }}
        />
      ) : error ? (
        <>
          <p role="alert">{error}</p>
          <button
            className="secondary-button"
            onClick={async () => {
              try {
                const r = await boardRequest<{ url: string }>(
                  "/media/" + media.id,
                );
                setUrl(r.url);
                setError("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              }
            }}
          >
            Try picture again
          </button>
        </>
      ) : (
        <p>Opening your picture…</p>
      )}
      <p className="media-description">{media.metadata.altText}</p>
    </div>
  );
}
