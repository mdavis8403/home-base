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
  const lock = useRef(false);
  const [timer, setTimer] = useState(true),
    [deadline, setDeadline] = useState<number | null>(null),
    [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Synchronize a browser-owned object URL and release it when the blob changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  useEffect(() => {
    if (!timer || deadline === null) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer, deadline]);
  return (
    <form
      className="entry-form board-response"
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        setError("");
        if (board.type !== "question" && !blob) {
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
        <legend>
          {board.revealed ? "Add your little piece" : "Your little secret"}
        </legend>
        {board.type === "question" ? (
          <label>
            Your answer
            <textarea
              required
              maxLength={3000}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A wild idea? A little thought? Anything goes."
            />
          </label>
        ) : (
          <>
            {!blob && board.type === "photo" && (
              <label className="file-picker">
                Choose your photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) {
                      setError("Choose a photo smaller than 8 MB.");
                      return;
                    }
                    setError("");
                    setBlob(file);
                  }}
                />
                <span className="muted">
                  One photo, just from you. JPEG, PNG or WebP · up to 8 MB.
                </span>
              </label>
            )}
            {!blob && board.type === "drawing" && (
              <>
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
                    <span
                      className="drawing-time"
                      role="timer"
                      aria-label="Time left"
                    >
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
                  onSave={setBlob}
                  helpText="Draw with a finger, stylus, or mouse. You can also choose a drawing file below."
                />
                <label className="file-picker">
                  Or choose a drawing file
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 8 * 1024 * 1024) {
                        setError("Choose a drawing smaller than 8 MB.");
                        return;
                      }
                      setError("");
                      setBlob(file);
                    }}
                  />
                  <span className="muted">JPEG, PNG or WebP · up to 8 MB.</span>
                </label>
              </>
            )}
            {blob && (
              <div className="media-preview">
                {preview && (
                  <img
                    src={preview}
                    alt={alt || "Your private picture preview"}
                  />
                )}
                <label>
                  Describe your picture
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
                    setDeadline(null);
                    setSeconds(60);
                  }}
                >
                  Choose again
                </button>
              </div>
            )}
          </>
        )}
      </fieldset>
      <p className="muted">
        {board.revealed
          ? "The board is open. Your response will join the others right away."
          : "Once tucked away, your response stays yours until the big reveal."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy
          ? "Tucking it away…"
          : board.revealed
            ? "Add to our board"
            : "Tuck mine away"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
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
