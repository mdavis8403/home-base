"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/shared/types";
import type {
  StoryBookView,
  StoryLanding,
  StorySummary,
} from "@/lib/shared/story/types";
import { storyRequest } from "./api";
import { BookReader, Bookshelf } from "./book";
import { StoryMixer } from "./mixer";
type Screen = "landing" | "mixer" | "reading" | "books";
const TURN_MS = 900;
export function OurStory({ profile }: { profile: Profile }) {
  const [landing, setLanding] = useState<StoryLanding | null>(null);
  const [screen, setScreen] = useState<Screen>("landing");
  const [book, setBook] = useState<StoryBookView | null>(null);
  const [mixerSession, setMixerSession] = useState<string | null>(null);
  const [reread, setReread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turning, setTurning] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  // Full-screen storybook: hide the standard family shell while this room owns the view.
  useEffect(() => {
    document.body.classList.add("immersive");
    return () => document.body.classList.remove("immersive");
  }, []);
  const loadLanding = useCallback(async () => {
    try {
      setLanding(await storyRequest<StoryLanding>());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLanding();
  }, [loadLanding]);
  async function openReading(id: string, asReread: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await storyRequest<StoryBookView>(
        "?id=" + encodeURIComponent(id),
      );
      setBook(next);
      setReread(asReread);
      setScreen("reading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function startMixer() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      await storyRequest<{ sessionId: string }>("/mixer-start", { id });
      setMixerSession(id);
      setScreen("mixer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function continueMixer() {
    if (landing?.mixer) {
      setMixerSession(landing.mixer.sessionId);
      setScreen("mixer");
    }
  }
  async function advance(path: string, body: Record<string, unknown>) {
    if (lock.current || !book) return;
    lock.current = true;
    setTurning(true);
    setError("");
    try {
      const [next] = await Promise.all([
        storyRequest<StoryBookView>(path, { storyId: book.id, ...body }),
        new Promise((r) => setTimeout(r, TURN_MS)),
      ]);
      setBook(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setTurning(false);
    }
  }
  async function toShelf() {
    setScreen("books");
    setBook(null);
    await loadLanding();
  }
  const active = landing?.active ?? null;
  const mixer = landing?.mixer ?? null;
  const hasBooks = (landing?.books.length ?? 0) > 0;

  // The closed book's primary action depends on where the family is. The Story
  // Mixer (finishing what the family started) takes priority over an older story.
  let mode: "open" | "mixer" | "continue" | "start";
  let label: string;
  let eyebrow: string;
  let hint: string;
  if (mixer?.status === "complete") {
    mode = "open";
    label = "Open Our Story";
    eyebrow = "READY";
    hint = "all three envelopes are sealed";
  } else if (mixer) {
    mode = "mixer";
    if (mixer.mineSealed) {
      label = "Our story is brewing";
      eyebrow = "SEALED";
      hint = `${mixer.sealedCount} of 3 sealed`;
    } else {
      label = "Continue the Story Mixer";
      eyebrow = "YOUR TURN";
      hint = "add your secret ingredients";
    }
  } else if (active) {
    mode = "continue";
    label = active.title;
    eyebrow = "CONTINUE";
    hint = "waiting to be continued";
  } else {
    mode = "start";
    label = "Start a new story";
    eyebrow = "OPEN THE BOOK";
    hint = "tap to begin";
  }
  function runPrimary() {
    if (mode === "continue" && active) void openReading(active.id, false);
    else if (mode === "start") void startMixer();
    else continueMixer();
  }
  const hotspotAria =
    mode === "continue"
      ? `Continue our story: ${active?.title ?? ""}`
      : label;

  return (
    <div className="story-immersive">
      <header className="clubhouse-bar story-bar">
        <Link className="clubhouse-brand" href="/home">
          <span aria-hidden="true">←</span> THE CLUBHOUSE
        </Link>
        <h1 className="mystery-bar-title">
          <span aria-hidden="true">✦</span> Our Story
        </h1>
      </header>
      <main className="story-stage">
        {error && screen !== "mixer" && (
          <p className="form-error story-float" role="alert">
            {error}
          </p>
        )}
        {screen === "landing" && (
          <section className="book-frame landing" aria-label="Our Story">
            <button
              className="book-hotspot"
              disabled={busy}
              aria-label={hotspotAria}
              onClick={runPrimary}
            >
              <span className="hotspot-eyebrow">{eyebrow}</span>
              <span className="hotspot-label">{label}</span>
              <span className="hotspot-hint">{hint}</span>
            </button>
            <div className="landing-caption">
              <p className="nook-tagline">A story only we could tell.</p>
              <div className="landing-actions">
                {(active || mixer) && (
                  <button
                    className="ink-link"
                    disabled={busy}
                    onClick={() => void startMixer()}
                  >
                    Start a new story
                  </button>
                )}
                <button
                  className="ink-link"
                  disabled={busy}
                  onClick={() => setScreen("books")}
                >
                  Our books{hasBooks ? ` (${landing?.books.length})` : ""}
                </button>
              </div>
            </div>
          </section>
        )}
        {screen === "mixer" && mixerSession && (
          <StoryMixer
            sessionId={mixerSession}
            onOpenStory={(id) => {
              setMixerSession(null);
              void openReading(id, false);
              void loadLanding();
            }}
            onExit={() => {
              setMixerSession(null);
              setScreen("landing");
              void loadLanding();
            }}
          />
        )}
        {screen === "reading" && book && (
          <BookReader
            key={`${book.id}-${reread}`}
            book={book}
            reread={reread}
            turning={turning}
            isParent={profile.role !== "child"}
            onChoose={(sequence, choiceId) =>
              void advance("/choose", { sequence, choiceId })
            }
            onShelf={() => void toShelf()}
            onAgain={() => {
              setReread(true);
            }}
            onClose={() => {
              setBook(null);
              setScreen("landing");
              void loadLanding();
            }}
          />
        )}
        {screen === "books" && (
          <div className="book-frame library">
            <div className="story-library">
              <button
                className="story-btn ghost lib-back"
                onClick={() => setScreen("landing")}
              >
                ‹ Back to the reading nook
              </button>
              <Bookshelf
                inProgress={landing?.inProgress ?? []}
                books={landing?.books ?? []}
                onOpen={(b: StorySummary) =>
                  void openReading(b.id, b.status === "completed")
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
