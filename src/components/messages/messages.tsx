/* eslint-disable @next/next/no-img-element -- Private media and local previews must bypass the public image optimization cache. */
"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Profile } from "@/lib/shared/types";
import type { MessageItem } from "@/lib/shared/messages";
import { Composer } from "./composer";
import { messageRequest } from "./api";
const subscribeToBrowser = () => () => {};
const filters = ["All", "From Mom", "From Dad", "From Mia", "Favorites"];
function Attachment({ asset }: { asset: MessageItem["media"][number] }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    setError("");
    try {
      setUrl((await messageRequest<{ url: string }>("/media/" + asset.id)).url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Try opening this again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="message-attachment">
      {!url && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void open()}
        >
          {busy
            ? "Opening…"
            : asset.mediaType === "audio"
              ? "Listen to their voice"
              : asset.mediaType === "video"
                ? "Watch their video"
                : asset.mediaType === "doodle"
                  ? "Open their drawing"
                  : "Open their photo"}
        </button>
      )}
      {url && (asset.mediaType === "photo" || asset.mediaType === "doodle") && (
        <img
          src={url}
          alt={asset.metadata.altText}
          onError={() => {
            setUrl("");
            setError("Tap to open a fresh private link.");
          }}
        />
      )}
      {url && asset.mediaType === "audio" && (
        <audio
          controls
          preload="none"
          src={url}
          aria-label={asset.metadata.altText}
          onError={() => {
            setUrl("");
            setError("Tap to open a fresh private link.");
          }}
        />
      )}
      {url && asset.mediaType === "video" && (
        <video
          controls
          playsInline
          preload="none"
          src={url}
          aria-label={asset.metadata.altText}
          onError={() => {
            setUrl("");
            setError("Tap to open a fresh private link.");
          }}
        />
      )}
      <p className="media-description">{asset.metadata.altText}</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function Messages({
  profile,
  initial,
}: {
  profile: Profile;
  initial: MessageItem[];
}) {
  const [items, setItems] = useState(initial);
  const localDates = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );
  const [view, setView] = useState<"inbox" | "archive" | "sent">("inbox");
  const [filter, setFilter] = useState("All");
  const [compose, setCompose] = useState(false);
  const [opened, setOpened] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestNumber = useRef(0);
  const composeButton = useRef<HTMLButtonElement>(null);
  async function refresh(next = view) {
    const current = ++requestNumber.current;
    setBusy(true);
    setError("");
    try {
      const data = await messageRequest<MessageItem[]>(
        next === "sent" ? "?view=sent" : "",
      );
      if (current === requestNumber.current) {
        setItems(data);
        setView(next);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (current === requestNumber.current) setBusy(false);
    }
  }
  // Delivery needs no job: recheck when the user returns or taps Refresh.
  useEffect(() => {
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
    // This is a content fetch only; no presence/activity is written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  async function update(
    m: MessageItem,
    action: "read" | "love" | "favorite",
    value: boolean,
  ) {
    setBusy(true);
    setError("");
    try {
      await messageRequest("/" + m.id, { action, value });
      setItems((previous) =>
        previous.map((item) =>
          item.id === m.id
            ? {
                ...item,
                ...(action === "read"
                  ? { read: value }
                  : action === "favorite"
                    ? { favorite: value }
                    : {
                        loved: value,
                        hearts: value
                          ? [
                              ...item.hearts.filter(
                                (n) => n !== profile.displayName,
                              ),
                              profile.displayName,
                            ]
                          : item.hearts.filter(
                              (n) => n !== profile.displayName,
                            ),
                      }),
              }
            : item,
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter(
    (m) =>
      view !== "archive" ||
      filter === "All" ||
      (filter === "Favorites" ? m.favorite : filter === "From " + m.senderName),
  );
  function close() {
    setCompose(false);
    requestAnimationFrame(() => composeButton.current?.focus());
  }
  if (compose)
    return (
      <Composer
        profile={profile}
        onClose={close}
        onSent={(later) => {
          close();
          setNotice(
            later
              ? "A little something is tucked away for later."
              : "Your something special is on its way.",
          );
          void refresh(later ? "sent" : "inbox");
        }}
      />
    );
  return (
    <section className="messages-room">
      <header className="messages-heading">
        <div>
          <p className="eyebrow">OUR OWN LITTLE POST OFFICE</p>
          <h1>Messages</h1>
          <p>Little things from the people you love.</p>
        </div>
        <button
          ref={composeButton}
          className="button"
          onClick={() => {
            setNotice("");
            setCompose(true);
          }}
        >
          Leave something <span aria-hidden="true">↗</span>
        </button>
      </header>
      <div className="message-tabs" aria-label="Message views">
        {(["inbox", "archive", "sent"] as const).map((v) => (
          <button
            className="text-button"
            aria-pressed={view === v}
            key={v}
            disabled={busy}
            onClick={() => {
              setFilter("All");
              void refresh(v);
            }}
          >
            {v === "inbox"
              ? "For you"
              : v === "archive"
                ? "Our keepsakes"
                : "Sent & scheduled"}
          </button>
        ))}
        <button
          className="text-button refresh-messages"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>
      {view === "archive" && (
        <div
          className="message-controls archive-filters"
          aria-label="Archive filters"
        >
          {filters.map((f) => (
            <button
              className="secondary-button"
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}
      <div role="status" className="message-notice">
        {busy ? "One moment…" : notice}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="section-heading">
        <h2>
          {view === "inbox"
            ? "Left here, just for you."
            : view === "sent"
              ? "A little love, sent."
              : "Good things to come back to."}
        </h2>
        <p className="muted">
          {view === "inbox"
            ? "Open a note. Take your time."
            : view === "sent"
              ? "Your notes and future surprises."
              : "Every note has a home here."}
        </p>
      </div>
      {!visible.length ? (
        <div className="empty-post">
          <span aria-hidden="true">✉</span>
          <h3>
            {filter === "Favorites"
              ? "Keep the ones you love."
              : view === "sent"
                ? "Start with a little hello."
                : "A quiet little corner, for now."}
          </h3>
          <p>
            {filter === "Favorites"
              ? "Tap Save favorite on a note to keep it here."
              : view === "sent"
                ? "Leave a note, a drawing, or a familiar voice."
                : "When someone leaves you something, you’ll find it here."}
          </p>
          <div className="post-stitch" aria-hidden="true">
            ♡ · ♡ · ♡
          </div>
        </div>
      ) : (
        <div className="message-stack">
          {visible.map((m) => {
            const isOpen = opened.includes(m.id);
            const future = m.scheduled;
            return (
              <article
                key={m.id}
                className={`message-note ${!m.read && m.isRecipient ? "unread" : ""}`}
              >
                <div className="note-top">
                  <span className="note-seal" aria-hidden="true">
                    {m.senderName.slice(0, 1)}
                  </span>
                  <div>
                    <p className="note-label">
                      {future
                        ? "TUCKED AWAY FOR LATER"
                        : !m.read && m.isRecipient
                          ? "SOMETHING NEW"
                          : "A LITTLE SOMETHING"}
                    </p>
                    <h3 id={"message-title-" + m.id} tabIndex={-1}>
                      {!m.read && m.isRecipient
                        ? "Something new from "
                        : "Something from "}
                      {m.senderName}
                    </h3>
                    <p className="note-date">
                      {localDates
                        ? new Date(m.sendAt).toLocaleString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "…"}{" "}
                      · For {m.recipients.join(" + ")}
                    </p>
                  </div>
                </div>
                {!isOpen ? (
                  <button
                    className="note-open"
                    disabled={busy}
                    onClick={() => {
                      document
                        .getElementById("message-title-" + m.id)
                        ?.focus({ preventScroll: true });
                      setOpened([...opened, m.id]);
                      if (m.isRecipient && !m.read)
                        void update(m, "read", true);
                    }}
                  >
                    Open your note <span aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <div className="note-content">
                    {m.text && <p className="note-body">{m.text}</p>}
                    {m.media.map((asset) => (
                      <Attachment key={asset.id} asset={asset} />
                    ))}
                    {m.isRecipient && (
                      <div className="note-actions">
                        <button
                          disabled={busy}
                          aria-pressed={m.loved}
                          onClick={() => void update(m, "love", !m.loved)}
                        >
                          {m.loved ? "❤️ Loved" : "♡ Send a heart"}
                        </button>
                        <button
                          disabled={busy}
                          aria-pressed={m.favorite}
                          onClick={() =>
                            void update(m, "favorite", !m.favorite)
                          }
                        >
                          {m.favorite ? "★ Saved favorite" : "☆ Save favorite"}
                        </button>
                      </div>
                    )}
                    {m.hearts.length > 0 && (
                      <p className="heart-note">
                        ❤️ Loved by {m.hearts.join(" + ")}
                      </p>
                    )}
                    <button
                      className="note-open"
                      onClick={() => {
                        document
                          .getElementById("message-title-" + m.id)
                          ?.focus({ preventScroll: true });
                        setOpened(opened.filter((id) => id !== m.id));
                      }}
                    >
                      Fold up note
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="messages-footer">
        No hurry. No perfect words needed. Just us.
      </p>
    </section>
  );
}
